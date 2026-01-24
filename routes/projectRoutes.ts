import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { validate } from '../middlewares/validate.js';
import { CreateProjectSchema, UpdateProjectSchema } from '../schemas/projectSchemas.js';
import { HttpError } from '../utils/httpError.js';
import { enforceFreeProjectLimit } from '../middlewares/planMiddleware.js';

export const projectRoutes = Router();

projectRoutes.get('/', async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (e) {
    return next(new HttpError(500, 'Erro ao listar projetos.', undefined, e));
  }
});

projectRoutes.post('/', enforceFreeProjectLimit(3) as any, validate(CreateProjectSchema) as any, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));
    const { id, name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig } = req.body;
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
    res.status(201).json(project);
  } catch (e: any) {
    if (e?.name?.startsWith?.('Prisma')) return next(e);
    return next(new HttpError(500, 'Erro ao criar projeto.', undefined, e));
  }
});

projectRoutes.put('/:id', validate(UpdateProjectSchema) as any, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return next(new HttpError(404, 'Projeto não encontrado.'));

    const project = await prisma.project.update({
      where: { id },
      data: req.body,
    });
    res.json(project);
  } catch (e: any) {
    if (e?.name?.startsWith?.('Prisma')) return next(e);
    return next(new HttpError(500, 'Erro ao atualizar projeto.', undefined, e));
  }
});

projectRoutes.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return next(new HttpError(401, 'Token não fornecido'));

    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return next(new HttpError(404, 'Projeto não encontrado.'));

    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (e: any) {
    if (e?.name?.startsWith?.('Prisma')) return next(e);
    return next(new HttpError(500, 'Erro ao apagar projeto.', undefined, e));
  }
});

