
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectricalEngine } from './services/electricalEngine';
import { gisController } from './controllers/gisController';
import { authMiddleware } from './middlewares/authMiddleware';
// Use require for Prisma if import fails in some environments
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cast express.json() to any to fix overload mismatch in some environments
app.use(express.json() as any);

const PORT = process.env.PORT || 3001;

// --- API AUTH ---
app.post('/api/auth/sync', authMiddleware as any, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get('/api/auth/me', authMiddleware as any, (req, res) => {
  res.json((req as any).user);
});

// --- API PROJECTS (Smart Persistence) ---
app.get('/api/projects', authMiddleware as any, async (req, res) => {
  const user = (req as any).user;
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(projects);
});

app.post('/api/projects', authMiddleware as any, async (req, res) => {
  const user = (req as any).user;
  const { name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig } = req.body;
  
  const project = await prisma.project.upsert({
    where: { id: req.body.id || 'new-id' },
    update: { name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig, updatedAt: new Date() },
    create: { 
      id: req.body.id,
      name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig,
      ownerId: user.id 
    }
  });
  res.json(project);
});

app.delete('/api/projects/:id', authMiddleware as any, async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// --- API ENGINE (Heavy Lifting) ---
app.post('/api/calculate', authMiddleware as any, (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/optimize', authMiddleware as any, (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const optimizedNodes = ElectricalEngine.optimize(scenarioId, nodes, params, cables, ips);
    res.json(optimizedNodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- GIS ---
app.post('/api/nodes', authMiddleware as any, gisController.createNode as any);
app.get('/api/nodes', authMiddleware as any, gisController.getNodes as any);

// --- STATIC ASSETS ---
const staticDir = path.resolve(__dirname, 'dist');
app.use(express.static(staticDir));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.resolve(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`>>> sisCQT Enterprise Server running on port ${PORT}`);
});
