import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectricalEngine } from './services/electricalEngine.ts';
import { gisController } from './controllers/gisController.ts';
import { authMiddleware } from './middlewares/authMiddleware.ts';

// Mock Prisma for preview environment stability
const prisma = {
  project: {
    findMany: async () => [],
    upsert: async (data: any) => data.create
  },
  user: {
    upsert: async (data: any) => data.create
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. MIME Type Middleware - CRÍTICO PARA O PREVIEW
app.use((req, res, next) => {
  if (req.url.endsWith('.tsx') || req.url.endsWith('.ts')) {
    res.type('application/javascript');
  }
  next();
});

// 2. CORS e Headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json() as any);

const PORT = process.env.PORT || 8080;

// API Routes
app.post('/api/auth/sync', authMiddleware as any, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get('/api/auth/me', authMiddleware as any, (req, res) => {
  res.json((req as any).user);
});

app.get('/api/projects', authMiddleware as any, async (req, res) => {
  try {
    const user = (req as any).user;
    const projects = await prisma.project.findMany();
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar projetos.' });
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

// Static files handling
const staticDir = path.resolve(__dirname);
app.use(express.static(staticDir) as any);

// SPA Fallback
app.get('*', (req: any, res: any) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`>>> siSCQT Enterprise active on port ${PORT}`);
});