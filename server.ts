
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectricalEngine } from './services/electricalEngine';
import { gisController } from './controllers/gisController';
import { authMiddleware } from './middlewares/authMiddleware';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- SEGURANÇA E CORS ---
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.json() as any);

const PORT = process.env.PORT || 8080;

// --- API ROUTES ---
app.post('/api/auth/sync', authMiddleware as any, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get('/api/auth/me', authMiddleware as any, (req, res) => {
  res.json((req as any).user);
});

app.get('/api/projects', authMiddleware as any, async (req, res) => {
  try {
    const user = (req as any).user;
    const projects = await prisma.project.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar projetos' });
  }
});

app.post('/api/projects', authMiddleware as any, async (req, res) => {
  const user = (req as any).user;
  const { id, name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig } = req.body;
  
  try {
    const project = await prisma.project.upsert({
      where: { id: id || 'new-id' },
      update: { name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig, updatedAt: new Date() },
      create: { 
        id: id || undefined,
        name, metadata, scenarios, activeScenarioId, cables, ipTypes, reportConfig,
        ownerId: user.id 
      }
    });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar projeto' });
  }
});

app.post('/api/calculate', authMiddleware as any, (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Added optimize endpoint to handle optimization requests from the frontend
app.post('/api/optimize', authMiddleware as any, (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.optimize(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- STATIC FILES & TSX HANDLING ---
const staticDir = path.resolve(__dirname);
// Middleware para garantir que o navegador entenda .tsx como módulo se não houver build step intermediário
app.use((req, res, next) => {
  if (req.url.endsWith('.tsx')) {
    res.type('application/javascript');
  }
  next();
});

app.use(express.static(staticDir));

// Fallback para SPA
// Fix: Use explicit any types for req and res to resolve TypeScript overload matching error on wildcard route
app.get('*', (req: any, res: any) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Endpoint não encontrado' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`>>> sisCQT Enterprise Server running on port ${PORT}`);
});
