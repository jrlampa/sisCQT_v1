import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectricalEngine } from './services/electricalEngine.ts';
import { GeminiService } from './services/geminiService.ts';
import { gisController } from './controllers/gisController.ts';
import { authMiddleware } from './middlewares/authMiddleware.ts';
import { prisma } from './utils/db.ts';



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

app.post('/api/projects', authMiddleware as any, async (req, res) => {
  try {
    const user = (req as any).user;
    const project = await prisma.project.create({
      data: {
        ...req.body,
        userId: user.id,
      },
    });
    res.status(201).json(project);
  } catch (e: any) {
    console.error("Failed to create project:", e.name, e.code, e); // DEBUG LOG
    if (e.name === 'PrismaClientValidationError') {
      return res.status(400).json({ error: 'Erro de validação ao criar projeto: ' + e.message });
    }
    res.status(500).json({ error: 'Erro ao criar projeto.' });
  }
});

app.put('/api/projects/:id', authMiddleware as any, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.update({
      where: { id },
      data: req.body,
    });
    res.json(project);
  } catch (e: any) {
    console.error("Failed to update project:", e.name, e.code, e); // DEBUG LOG
    if (e.name === 'PrismaClientValidationError') {
        return res.status(400).json({ error: 'Erro de validação ao atualizar projeto: ' + e.message });
    } else if (e.name === 'PrismaClientKnownRequestError' && e.code === 'P2025') {
        return res.status(404).json({ error: 'Projeto não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar projeto.' });
  }
});

app.delete('/api/projects/:id', authMiddleware as any, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (e: any) {
    console.error("Failed to delete project:", e.name, e.code, e); // DEBUG LOG
    if (e.name === 'PrismaClientKnownRequestError' && e.code === 'P2025') {
        return res.status(404).json({ error: 'Projeto não encontrado.' });
    }
    res.status(500).json({ error: 'Erro ao apagar projeto.' });
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

app.post('/api/gemini/ask', authMiddleware as any, async (req, res) => {
  const { prompt, context } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const result = await GeminiService.askEngineeringQuestion(prompt, context);
    res.json({ result });
  } catch (error: any) {
    console.error("Error in /api/gemini/ask:", error);
    res.status(500).json({ error: error.message });
  }
});

// GIS Routes
app.get('/api/gis/nodes', authMiddleware as any, gisController.getNodes);
app.post('/api/gis/nodes', authMiddleware as any, gisController.createNode);

app.post('/api/optimize', authMiddleware as any, (req, res) => {
  const { nodes } = req.body;
  // Placeholder: A lógica de otimização real seria implementada aqui.
  // Por agora, apenas retornamos os nós recebidos para simular sucesso.
  console.log('Optimization requested, returning mock data.');
  res.json(nodes);
});

// Static files handling
const staticDir = path.resolve(__dirname);
app.use(express.static(staticDir) as any);

// SPA Fallback
// A MUDANÇA É AQUI: Trocámos '*' por /.*/ (Express 5 exige Regex ou sintaxe diferente)
app.get(/.*/, (req: any, res: any) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`>>> siSCQT Enterprise active on port ${PORT}`);
});

export default app;