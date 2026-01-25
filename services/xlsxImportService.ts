import * as ExcelJS from 'exceljs';
import { z } from 'zod';
import { DEFAULT_CABLES, DMDI_TABLES, IP_TYPES } from '../constants.js';
import { CreateProjectSchema } from '../schemas/projectSchemas.js';

type Workbook = ExcelJS.Workbook;
type Worksheet = ExcelJS.Worksheet;
type CellValue = ExcelJS.CellValue;

function cellToPrimitive(v: CellValue): unknown {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    // Fórmulas: { formula, result }
    if ('result' in v) return (v as any).result ?? '';
    // Hyperlink: { text, hyperlink }
    if ('text' in v) return (v as any).text ?? '';
    // Rich text: { richText: [{ text }] }
    if ('richText' in v && Array.isArray((v as any).richText)) {
      return (v as any).richText.map((p: any) => p?.text ?? '').join('');
    }
  }
  return v as any;
}

function worksheetToMatrix(sheet: Worksheet, maxRows?: number): any[][] {
  const out: any[][] = [];
  const maxCol = Math.max(1, sheet.columnCount || 1);
  const rowCount = sheet.rowCount || 0;
  const lastRow = Math.min(rowCount, maxRows ?? rowCount);
  for (let r = 1; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const arr: any[] = [];
    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c);
      arr.push(cellToPrimitive(cell.value as any) ?? '');
    }
    out.push(arr);
  }
  return out;
}

function worksheetToRowObjects(sheet: Worksheet): Record<string, any>[] {
  const matrix = worksheetToMatrix(sheet);
  if (matrix.length === 0) return [];
  const header = (matrix[0] || []).map((c) => String(c ?? '').trim());
  const usedKeys = new Set<string>();

  const rows: Record<string, any>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const obj: Record<string, any> = {};
    for (let c = 0; c < header.length; c++) {
      const rawKey = header[c];
      if (!rawKey) continue;
      let key = rawKey;
      if (usedKeys.has(key)) key = `${rawKey}_${c + 1}`;
      obj[key] = row[c] ?? '';
      usedKeys.add(key);
    }
    rows.push(obj);
  }
  return rows;
}

function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '');
}

function firstNonEmptyString(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return null;
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v ?? '').trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

type SheetCandidate = { name: string; headers: string[]; score: number };

function scoreNodeSheet(headers: string[]): number {
  const h = new Set(headers.map(normalizeHeader));
  const hasId = h.has('id') || h.has('no') || h.has('node') || h.has('ponto') || h.has('poste');
  const hasParent =
    h.has('parentid') ||
    h.has('parent') ||
    h.has('pai') ||
    h.has('id_pai') ||
    h.has('origem') ||
    h.has('no_pai');
  const hasMeters = h.has('meters') || h.has('metros') || h.has('distancia') || h.has('comprimento');
  const hasCable = h.has('cable') || h.has('cabo') || h.has('bitola');

  let score = 0;
  if (hasId) score += 4;
  if (hasParent) score += 3;
  if (hasMeters) score += 2;
  if (hasCable) score += 2;
  if (h.has('mono')) score += 1;
  if (h.has('tri')) score += 1;
  if (h.has('ipqty') || h.has('quantidade_ip') || h.has('ip_qtd')) score += 1;
  if (h.has('solarkva') || h.has('gd_kva') || h.has('kva_gd')) score += 1;
  return score;
}

function getSheetHeaders(sheet: Worksheet): string[] {
  const rows = worksheetToMatrix(sheet, 1);
  const firstRow = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : [];
  return firstRow.map((c) => String(c ?? '').trim()).filter(Boolean);
}

function pickBestNodeSheet(workbook: Workbook): SheetCandidate | null {
  const candidates: SheetCandidate[] = [];
  for (const sheet of workbook.worksheets) {
    const name = sheet.name;
    const headers = getSheetHeaders(sheet);
    if (headers.length === 0) continue;
    candidates.push({ name, headers, score: scoreNodeSheet(headers) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] ?? null;
}

const KeyValueSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
});

function parseKeyValueSheet(sheet: Worksheet): Record<string, unknown> {
  const rows = worksheetToMatrix(sheet);
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 2) continue;
    const k = String(r[0] ?? '').trim();
    if (!k) continue;
    const parsed = KeyValueSchema.safeParse({ key: k, value: r[1] });
    if (!parsed.success) continue;
    out[normalizeHeader(parsed.data.key)] = parsed.data.value;
  }
  return out;
}

function normalizeCellText(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findExpectedNumber(workbook: Workbook, patterns: RegExp[]): number | undefined {
  for (const sheet of workbook.worksheets) {
    const rows = worksheetToMatrix(sheet);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        const text = normalizeCellText(cell);
        if (!text) continue;
        if (!patterns.some((p) => p.test(text))) continue;

        const right = row[c + 1];
        const down = rows[r + 1]?.[c];
        const nRight = toNumber(right, NaN);
        if (Number.isFinite(nRight)) return nRight;
        const nDown = toNumber(down, NaN);
        if (Number.isFinite(nDown)) return nDown;
      }
    }
  }
  return undefined;
}

export type XlsxImportOutput = {
  project: any;
  // Mantemos `expected` para testes/validação local; pode ficar vazio dependendo do layout do XLSX.
  expected?: {
    maxCqt?: number;
    // Para planilhas no formato "TRECHO/TOTAL/MONO/BI/TRI", validamos a carga diversificada por nó.
    nodeDistributedKvaByScenario?: Record<string, Record<string, number>>;
  };
  debug: {
    sheetNames: string[];
    nodeSheetPicked?: string;
    scenarioSheetsDetected?: string[];
  };
};

export async function parseXlsxToProject(buffer: Buffer, fileName: string, overrides?: Partial<any>): Promise<XlsxImportOutput> {
  const workbook = new ExcelJS.Workbook();
  // Tipos do ExcelJS + Buffer genérico (Node) podem divergir em TS; em runtime funciona.
  await workbook.xlsx.load(buffer as any);

  const defaultCable = Object.keys(DEFAULT_CABLES)[4] || Object.keys(DEFAULT_CABLES)[0] || '3x95+54.6mm² Al';
  const defaultMeters = Number(process.env.IMPORT_XLSX_DEFAULT_METERS || 100);

  // Caso especial: planilha "real" no formato por TRECHO (ATUAL/PROJ 01/etc)
  const sheetNames = workbook.worksheets.map((s) => s.name);
  const scenarioSheetNames = sheetNames.filter((n) => {
    const u = String(n).toUpperCase();
    return u === 'ATUAL' || u === 'ATUAL+NC' || u === 'PROJ 01' || u === 'PROJ 02';
  });

  function extractManualClassFromSheet(sheet: Worksheet): 'A' | 'B' | 'C' | 'D' | null {
    const rows = worksheetToMatrix(sheet, 50);
    for (let r = 0; r < Math.min(rows.length, 50); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const v = String(row[c] ?? '');
        const m = v.match(/CLASSE\\s*\"?([ABCD])\"?/i);
        if (m && m[1]) return m[1].toUpperCase() as any;
      }
    }
    return null;
  }

  function parseTrechoLoadSheet(sheet: Worksheet) {
    const rows = worksheetToMatrix(sheet);
    let headerRowIdx = -1;
    let trechoColIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const idx = row.findIndex((cell) => normalizeCellText(cell) === 'trecho');
      if (idx !== -1) {
        headerRowIdx = r;
        trechoColIdx = idx;
        break;
      }
    }
    if (headerRowIdx === -1 || trechoColIdx === -1) return null;

    const header = rows[headerRowIdx] as any[];
    const colIdx: Record<string, number> = {};
    for (let c = 0; c < header.length; c++) {
      const key = normalizeCellText(header[c]);
      if (!key) continue;
      // Mantém o primeiro índice que aparecer (evita sobrescrever TOTAL duplicado)
      if (colIdx[key] === undefined) colIdx[key] = c;
    }

    const idxMono = colIdx['mono'];
    const idxBi = colIdx['bi'];
    const idxTri = colIdx['tri'];
    const idxTriEsp = colIdx['tri_especial'];

    // TOTAL do trecho (clientes) é o primeiro "total" após a coluna TRECHO
    let idxTotalClientes = -1;
    for (let c = trechoColIdx + 1; c < header.length; c++) {
      if (normalizeCellText(header[c]) === 'total') {
        idxTotalClientes = c;
        break;
      }
    }

    const ipCols: Array<{ idx: number; label: string }> = [];
    for (let c = 0; c < header.length; c++) {
      const raw = String(header[c] ?? '').trim();
      const norm = normalizeCellText(raw);
      // Ex.: IP70W, IP80W, IP150W...
      if (/^ip\\d+w$/.test(norm)) ipCols.push({ idx: c, label: raw });
    }

    const entries: Array<{
      trecho: number;
      totalClientesKva: number;
      mono: number;
      bi: number;
      tri: number;
      triEspecial: number;
      ipCounts: Record<string, number>;
    }> = [];

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const trechoVal = row[trechoColIdx];
      const trechoNum = toNumber(trechoVal, NaN);
      if (!Number.isFinite(trechoNum)) continue;

      const totalClientesKva = idxTotalClientes !== -1 ? toNumber(row[idxTotalClientes], 0) : 0;
      const mono = idxMono !== undefined ? toNumber(row[idxMono], 0) : 0;
      const bi = idxBi !== undefined ? toNumber(row[idxBi], 0) : 0;
      const tri = idxTri !== undefined ? toNumber(row[idxTri], 0) : 0;
      const triEspecial = idxTriEsp !== undefined ? toNumber(row[idxTriEsp], 0) : 0;

      const ipCounts: Record<string, number> = {};
      for (const col of ipCols) {
        const qty = toNumber(row[col.idx], 0);
        if (qty > 0) ipCounts[col.label] = qty;
      }

      entries.push({ trecho: Math.floor(trechoNum), totalClientesKva, mono, bi, tri, triEspecial, ipCounts });
    }

    return {
      entries,
      manualClass: extractManualClassFromSheet(sheet),
    };
  }

  if (scenarioSheetNames.length > 0) {
    const sobBase = fileName.replace(/\.(xlsx|xls)$/i, '').trim();
    const sob = sobBase.split(/\s+/)[0]?.slice(0, 50) || sobBase.slice(0, 50);

    const projectId = `PRJ_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
    const reportConfig = {
      showJustification: true,
      showKpis: true,
      showTopology: true,
      showMaterials: true,
      showSignatures: true,
      showUnifilar: true,
      showComparison: true,
    };

    // catálogo IP do projeto: adiciona IP 80W (presente no XLSX) e IP MIX (equivalência por kVA)
    const ipTypes = { ...IP_TYPES, 'IP 80W': 0.08, IP_MIX: 1.0 } as any;

    const scenarios: any[] = [];
    const nodeDistributedKvaByScenario: Record<string, Record<string, number>> = {};

    for (const sheetName of scenarioSheetNames) {
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet) continue;
      const parsed = parseTrechoLoadSheet(sheet);
      if (!parsed) continue;

      const used = parsed.entries.filter((e) => {
        const res = e.mono + e.bi + e.tri + e.triEspecial;
        const hasIp = Object.values(e.ipCounts).some((v) => v > 0);
        return e.totalClientesKva > 0 || res > 0 || hasIp;
      });
      if (used.length === 0) continue;

      used.sort((a, b) => a.trecho - b.trecho);

      const scenarioId = `SCN_${normalizeHeader(sheetName).toUpperCase()}_${Date.now()}`;
      nodeDistributedKvaByScenario[scenarioId] = {};

      const nodes: any[] = [
        {
          id: 'TRAFO',
          parentId: '',
          meters: 0,
          cable: defaultCable,
          loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
        },
      ];

      let prevId: string | null = null;
      for (const e of used) {
        const id = `T${e.trecho}`;
        const parentId = prevId ?? 'TRAFO';
        prevId = id;

        // IP: converte múltiplas potências para equivalente em kVA
        let ipType = 'Sem IP';
        let ipQty = 0;
        const ipEntries = Object.entries(e.ipCounts);
        if (ipEntries.length > 0) {
          let totalIpKva = 0;
          for (const [label, qty] of ipEntries) {
            const m = String(label).match(/IP\\s*(\\d+)W/i);
            const w = m ? Number(m[1]) : NaN;
            const key = Number.isFinite(w) ? `IP ${w}W` : null;
            const kva = key ? Number(ipTypes[key] || 0) : 0;
            totalIpKva += qty * kva;
          }
          if (totalIpKva > 0) {
            ipType = 'IP_MIX';
            ipQty = totalIpKva; // como IP_MIX=1.0 kVA
          }
        }

        nodes.push({
          id,
          parentId,
          meters: Number.isFinite(defaultMeters) && defaultMeters > 0 ? defaultMeters : 100,
          cable: defaultCable,
          loads: {
            mono: e.mono,
            bi: e.bi,
            tri: e.tri + e.triEspecial,
            pointQty: 0,
            pointKva: 0,
            ipType,
            ipQty,
            solarKva: 0,
            solarQty: 0,
          },
        });

        // esperado: total (clientes diversificados) no XLSX
        nodeDistributedKvaByScenario[scenarioId][id] = e.totalClientesKva;
      }

      // trafo kVA: tenta ler do CQT correspondente (F3), senão usa 75.
      const cqtName = `CQT ${sheetName}`.toUpperCase();
      const cqtSheetName = sheetNames.find((n) => String(n).toUpperCase() === cqtName);
      const cqtSheet = cqtSheetName ? workbook.getWorksheet(cqtSheetName) : undefined;
      const trafoCell = cqtSheet ? cellToPrimitive(cqtSheet.getCell('F3').value as any) : 75;
      const trafoKva = toNumber(trafoCell ?? 75, 75);

      scenarios.push({
        id: scenarioId,
        name: sheetName,
        updatedAt: new Date().toISOString(),
        params: {
          trafoKva,
          profile: 'Massivos',
          classType: 'Manual',
          manualClass: parsed.manualClass ?? 'B',
          normativeTable: 'PRODIST',
          includeGdInQt: false,
        },
        nodes,
      });
    }

    if (scenarios.length > 0) {
      const project = {
        id: projectId,
        name: overrides?.name ?? `Import XLSX - ${sob}`,
        metadata: {
          sob,
          electricPoint: 'BT-IMP',
          lat: -22.9,
          lng: -43.1,
          client: 'Importado via XLSX (TRECHO)',
        },
        scenarios,
        activeScenarioId: scenarios[0].id,
        cables: DEFAULT_CABLES,
        ipTypes,
        reportConfig,
      };

      const validated = CreateProjectSchema.parse(project);

      return {
        project: validated,
        expected: { nodeDistributedKvaByScenario },
        debug: { sheetNames, scenarioSheetsDetected: scenarioSheetNames },
      };
    }
  }

  // 1) localizar tabela de nós
  const best = pickBestNodeSheet(workbook);
  if (!best || best.score < 4) {
    const names = sheetNames;
    throw new Error(
      `Não foi possível localizar uma aba de rede/nós no XLSX. Abas encontradas: ${names.join(', ') || '(nenhuma)'}`
    );
  }

  const nodeSheet = workbook.getWorksheet(best.name)!;
  const rawRows = worksheetToRowObjects(nodeSheet);

  const nodes = rawRows
    .map((row: any, idx: number) => {
      // normaliza chaves
      const r: Record<string, any> = {};
      for (const [k, v] of Object.entries(row || {})) r[normalizeHeader(k)] = v;

      const id =
        firstNonEmptyString(r.id, r.no, r.node, r.ponto, r.poste, r.nome, r.codigo) ||
        `N_${idx + 1}`;

      const parentId = firstNonEmptyString(r.parentid, r.parent, r.pai, r.id_pai, r.origem, r.no_pai) || '';

      const meters = toNumber(r.meters ?? r.metros ?? r.distancia ?? r.comprimento, 0);
      const cable = firstNonEmptyString(r.cable, r.cabo, r.bitola) || defaultCable;

      const loads = {
        mono: toNumber(r.mono, 0),
        bi: toNumber(r.bi, 0),
        tri: toNumber(r.tri, 0),
        pointQty: toNumber(r.pointqty ?? r.qtd_pontos ?? r.qtd_ponto ?? r.ponto_qty, 0),
        pointKva: toNumber(r.pointkva ?? r.kva_ponto ?? r.ponto_kva, 0),
        ipType: firstNonEmptyString(r.iptype ?? r.tipo_ip ?? r.ip_tipo) || 'Sem IP',
        ipQty: toNumber(r.ipqty ?? r.qtd_ip ?? r.ip_qtd ?? r.quantidade_ip, 0),
        solarKva: toNumber(r.solarkva ?? r.gd_kva ?? r.kva_gd ?? r.solar_kva, 0),
        solarQty: toNumber(r.solarqty ?? r.gd_qty ?? r.qtd_gd ?? r.solar_qtd, 0),
      };

      const lat = r.lat !== undefined ? toNumber(r.lat, undefined as any) : undefined;
      const lng = r.lng !== undefined ? toNumber(r.lng, undefined as any) : undefined;

      return {
        id: String(id).trim().replace(/\s+/g, '_').toUpperCase(),
        parentId: String(parentId).trim().replace(/\s+/g, '_').toUpperCase(),
        meters: Math.max(0, meters),
        cable: String(cable),
        loads,
        ...(Number.isFinite(lat) ? { lat } : {}),
        ...(Number.isFinite(lng) ? { lng } : {}),
      };
    })
    .filter((n: any) => !!n?.id);

  // garante TRAFO
  const hasTrafo = nodes.some((n: any) => n.id === 'TRAFO');
  if (!hasTrafo) {
    nodes.unshift({
      id: 'TRAFO',
      parentId: '',
      meters: 0,
      cable: defaultCable,
      loads: { mono: 0, bi: 0, tri: 0, pointQty: 0, pointKva: 0, ipType: 'Sem IP', ipQty: 0, solarKva: 0, solarQty: 0 },
    });
  }

  // 2) tentar capturar metadados/params via abas key-value (best effort)
  const kv: Record<string, unknown> = {};
  for (const name of sheetNames) {
    const sheet = workbook.getWorksheet(name);
    if (!sheet) continue;
    // Heurística: abas tipo "CAPA/DADOS/PARAM" geralmente são key-value
    const norm = normalizeHeader(name);
    if (!['capa', 'dados', 'parametros', 'parametro', 'params', 'info', 'metadata'].includes(norm)) continue;
    Object.assign(kv, parseKeyValueSheet(sheet));
  }

  const sob = String(kv.sob ?? '').trim() || fileName.replace(/\.(xlsx|xls)$/i, '').slice(0, 50);
  const electricPoint = String(kv.ponto_eletrico ?? kv.electricpoint ?? kv.pe ?? 'BT-IMP').trim() || 'BT-IMP';
  const lat = toNumber(kv.lat ?? -22.9, -22.9);
  const lng = toNumber(kv.lng ?? -43.1, -43.1);
  const city = String(kv.cidade ?? kv.city ?? '').trim() || undefined;
  const client = String(kv.cliente ?? kv.client ?? '').trim() || 'Importado via XLSX';

  const trafoKva = toNumber(kv.trafo_kva ?? kv.transformador_kva ?? kv.kva_trafo ?? 75, 75);
  const profile = String(kv.perfil ?? kv.profile ?? 'Massivos').trim() || 'Massivos';
  const classType = String(kv.classificacao ?? kv.classtype ?? 'Automatic').trim() as any;
  const manualClass = String(kv.classe_manual ?? kv.manualclass ?? 'A').trim() as any;
  const normativeTable = String(kv.tabela ?? kv.normativetable ?? 'PRODIST').trim() || 'PRODIST';

  const scenarioId = `SCN_${Date.now()}`;
  const projectId = `PRJ_${Date.now()}`;
  const reportConfig = {
    showJustification: true,
    showKpis: true,
    showTopology: true,
    showMaterials: true,
    showSignatures: true,
    showUnifilar: true,
    showComparison: true,
  };

  const project = {
    id: projectId,
    name: overrides?.name ?? `Import XLSX - ${sob}`,
    metadata: {
      sob,
      electricPoint,
      lat,
      lng,
      ...(client ? { client } : {}),
      ...(city ? { city } : {}),
    },
    scenarios: [
      {
        id: scenarioId,
        name: 'IMPORTADO',
        updatedAt: new Date().toISOString(),
        params: {
          trafoKva,
          profile,
          classType: classType === 'Manual' ? 'Manual' : 'Automatic',
          manualClass: ['A', 'B', 'C', 'D'].includes(manualClass) ? manualClass : 'A',
          normativeTable: Object.keys(DMDI_TABLES).includes(normativeTable) ? normativeTable : 'PRODIST',
          includeGdInQt: kv.includegdinqt === true ? true : false,
        },
        nodes,
      },
    ],
    activeScenarioId: scenarioId,
    cables: DEFAULT_CABLES,
    ipTypes: IP_TYPES,
    reportConfig,
  };

  const validated = CreateProjectSchema.parse(project);

  // 3) expected (best effort): tenta achar maxCqt (key-value ou scan por rótulos)
  const expectedMaxCqtFromKv = kv.max_cqt ?? kv.maxcqt ?? kv.cqt_max;
  const expectedMaxCqt =
    expectedMaxCqtFromKv !== undefined
      ? toNumber(expectedMaxCqtFromKv, undefined as any)
      : findExpectedNumber(workbook, [/^max\s*cqt\b/, /^cqt\s*max\b/, /\bmaximo\s*cqt\b/]);
  const expected = Number.isFinite(expectedMaxCqt as any) ? { maxCqt: expectedMaxCqt as number } : undefined;

  return {
    project: validated,
    expected,
    debug: { sheetNames, nodeSheetPicked: best.name },
  };
}

