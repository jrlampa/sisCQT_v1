
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';

function isSqliteDatabase(): boolean {
  const url = process.env.DATABASE_URL || '';
  // Prisma usa "file:" para SQLite. Em algumas configurações pode vir como "sqlite:".
  return url.startsWith('file:') || url.startsWith('sqlite:');
}

function safeJsonObject(value: unknown): Record<string, any> {
  if (value == null) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, any>) : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value as Record<string, any>;
  return {};
}

export const gisController = {
  // Retorna FeatureCollection GeoJSON para consumo direto pelo Leaflet
  async getNodes(req: Request, res: Response, next: NextFunction) {
    try {
      const nodes: any[] = isSqliteDatabase()
        ? // SQLite: sem PostGIS; montamos o GeoJSON a partir de lat/lng
          await prisma.$queryRaw`
            SELECT 
              id, 
              name, 
              type, 
              properties,
              lat,
              lng
            FROM "NetworkNode"
          `
        : // Postgres + PostGIS: extraímos a geometria como JSON (GeoJSON) nativamente
          await prisma.$queryRaw`
            SELECT 
              id, 
              name, 
              type, 
              properties,
              ST_AsGeoJSON(location)::json as geometry
            FROM "NetworkNode"
          `;

      const featureCollection = {
        type: 'FeatureCollection',
        features: nodes.map((node) => {
          const props = safeJsonObject(node.properties);
          const geometry = isSqliteDatabase()
            ? {
                type: 'Point',
                coordinates: [Number(node.lng), Number(node.lat)],
              }
            : node.geometry;

          return {
            type: 'Feature',
            id: node.id,
            geometry,
            properties: {
              name: node.name,
              type: node.type,
              ...props,
            },
          };
        }),
      };

      // Cast Response to any to handle cases where standard Express methods aren't recognized correctly by the compiler
      (res as any).json(featureCollection);
    } catch (error: any) {
      return next(new HttpError(500, 'Erro ao carregar nós GIS.', undefined, error));
    }
  },

  // Criação de nó com conversão de lat/lng para geometria PostGIS
  async createNode(req: Request, res: Response, next: NextFunction) {
    // Cast Request to any to access the body property safely
    const { lat, lng, type, name, properties } = (req as any).body;
    
    try {
      const propsJson = JSON.stringify(properties || {});

      if (isSqliteDatabase()) {
        // SQLite: persistimos lat/lng diretamente (sem ST_* / casts / gen_random_uuid)
        await prisma.$queryRaw`
          INSERT INTO "NetworkNode" (id, name, type, lat, lng, properties, "createdAt")
          VALUES (
            ${randomUUID()},
            ${name},
            ${type},
            ${Number(lat)},
            ${Number(lng)},
            ${propsJson},
            ${new Date().toISOString()}
          )
        `;
      } else {
        // Postgres + PostGIS: o Prisma não suporta geometry nativamente no create(),
        // então usamos raw query com ST_SetSRID e ST_MakePoint.
        await prisma.$queryRaw`
          INSERT INTO "NetworkNode" (id, name, type, location, properties, "createdAt")
          VALUES (
            gen_random_uuid(), 
            ${name}, 
            ${type}::"NodeType", 
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 
            ${propsJson}::jsonb,
            NOW()
          )
        `;
      }
      
      (res as any).status(201).json({ success: true });
    } catch (error: any) {
      return next(new HttpError(500, 'Erro ao criar nó GIS.', undefined, error));
    }
  }
};