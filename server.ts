
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectricalEngine } from './services/electricalEngine';
import { gisController } from './controllers/gisController';
import { authMiddleware } from './middlewares/authMiddleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- API AUTH ---
// Endpoint especial para o primeiro login/sincronismo
app.post('/api/auth/sync', authMiddleware, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json((req as any).user);
});

// --- API PROTEGIDA (ENGINE & GIS) ---
app.post('/api/nodes', authMiddleware, gisController.createNode);
app.get('/api/nodes', authMiddleware, gisController.getNodes);

app.post('/api/calculate', authMiddleware, (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no processamento' });
  }
});

// --- SERVIÇO DE ARQUIVOS ESTÁTICOS ---
// Aponta explicitamente para a pasta 'dist' onde o Vite gera o build
const distPath = path.resolve(__dirname, '../dist'); // Ou apenas 'dist' dependendo de onde o server.ts fica após compilar

// Se estiver rodando via 'ts-node' na raiz, use 'dist'. 
// Se o server for compilado para dentro de dist, use __dirname.
// Para garantir, vamos checar se a pasta existe:
import fs from 'fs';
const staticDir = fs.existsSync(path.resolve(__dirname, 'dist')) 
    ? path.resolve(__dirname, 'dist') 
    : __dirname; 

app.use(express.static(staticDir));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.resolve(staticDir, 'index.html'));
});
