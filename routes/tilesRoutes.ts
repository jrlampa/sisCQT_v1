import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export const tilesRoutes = Router();

type BaseMapId = 'osm' | 'satellite' | 'light';

const BASEMAPS: Record<BaseMapId, { buildUrl: (z: number, x: number, y: number) => string }> = {
  osm: {
    // Preferimos um subdomínio fixo para cache determinístico.
    buildUrl: (z, x, y) => `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
  },
  satellite: {
    // Esri World Imagery: padrão {z}/{y}/{x}
    buildUrl: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  },
  light: {
    // CARTO light_all
    buildUrl: (z, x, y) => `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
  },
};

function isBaseMapId(v: string): v is BaseMapId {
  return v === 'osm' || v === 'satellite' || v === 'light';
}

function parseSafeInt(v: string): number | null {
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function getTilesCacheDir(): string {
  // Desktop/Electron poderá sobrescrever via env.
  return process.env.TILES_CACHE_DIR || path.join(process.cwd(), '.tile-cache');
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

tilesRoutes.get('/:basemapId/:z/:x/:y.png', async (req: Request, res: Response) => {
  const basemapIdRaw = String(req.params.basemapId || '');
  if (!isBaseMapId(basemapIdRaw)) return res.status(404).end();

  const z = parseSafeInt(String(req.params.z || ''));
  const x = parseSafeInt(String(req.params.x || ''));
  const y = parseSafeInt(String(req.params.y || ''));
  if (z === null || x === null || y === null) return res.status(404).end();

  const cacheRoot = getTilesCacheDir();
  const tilePath = path.join(cacheRoot, basemapIdRaw, String(z), String(x), `${y}.png`);

  // 1) Cache hit
  if (await fileExists(tilePath)) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return fs.createReadStream(tilePath).pipe(res);
  }

  // 2) Cache miss -> proxy online
  const remoteUrl = BASEMAPS[basemapIdRaw].buildUrl(z, x, y);
  try {
    const r = await fetch(remoteUrl, {
      headers: {
        // OSM e outros provedores preferem User-Agent explícito.
        'User-Agent': process.env.TILES_USER_AGENT || 'sisCQT/1.0 (tile-cache)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!r.ok) {
      // Se o provedor responder 404/403/etc, não cacheamos.
      return res.status(r.status).end();
    }

    const ab = await r.arrayBuffer();
    const buf = Buffer.from(ab);

    // Persistir no cache (best-effort)
    try {
      await fsp.mkdir(path.dirname(tilePath), { recursive: true });
      await fsp.writeFile(tilePath, buf);
    } catch {
      // Ignora falhas de escrita (ex.: permissão), mas ainda serve o tile.
    }

    const contentType = r.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(buf);
  } catch {
    // Offline/sem internet: não há tile e não dá para buscar.
    return res.status(404).end();
  }
});

