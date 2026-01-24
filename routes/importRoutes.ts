import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { parseXlsxToProject } from '../services/xlsxImportService.js';

export const importRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.IMPORT_XLSX_MAX_BYTES || 25 * 1024 * 1024),
  },
});

importRoutes.post('/xlsx', upload.single('file'), async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return next(new HttpError(400, 'Arquivo XLSX é obrigatório (field: file).'));

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      return next(new HttpError(400, 'Formato inválido. Envie um arquivo .xlsx'));
    }

    const parsed = await parseXlsxToProject(file.buffer, file.originalname, {
      // Em form-data, campos chegam como string.
      name: typeof (req as any).body?.name === 'string' ? (req as any).body.name : undefined,
    });

    const { id, name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig } = parsed.project as any;

    const project = await prisma.project.create({
      data: {
        id,
        name,
        metadata,
        scenarios,
        activeScenarioId,
        cables,
        ipTypes,
        reportConfig,
        userId: user.id,
      },
    });

    return res.status(201).json({
      projectId: project.id,
      project,
      debug: parsed.debug,
    });
  } catch (e: any) {
    return next(new HttpError(400, e?.message || 'Falha ao importar XLSX.', undefined, e));
  }
});

