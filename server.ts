
import express from 'express';
import { ElectricalEngine } from './services/electricalEngine';
import { GoogleGenAI } from "@google/genai";
import { gisController } from './controllers/gisController';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Mock Database de Usuários
const USERS = [
  { id: 'u1', name: 'Jonatas Lampa', email: 'jonatas.lampa@im3brasil.com.br', plan: 'Enterprise', role: 'admin', password: 'admin-password' }
];

const SESSIONS = new Map<string, any>();

// --- MIDDLEWARE DE LOG ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- AUTH ENDPOINTS ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (user) {
    const token = `tk-${Date.now()}`;
    const { password: _, ...userProfile } = user;
    SESSIONS.set(token, userProfile);
    res.json({ token, user: userProfile });
  } else {
    res.status(401).json({ error: 'Incorreto' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && SESSIONS.has(token)) res.json(SESSIONS.get(token));
  else res.status(401).json({ error: 'Não autorizado' });
});

// --- GIS ENDPOINTS ---
app.get('/api/nodes', gisController.getNodes);
app.post('/api/nodes', gisController.createNode);

// --- ENGINE ENDPOINTS ---
app.post('/api/calculate', (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no motor' });
  }
});

app.listen(PORT, () => {
  console.log(`>>> sisCQT Enterprise GIS Backend Online na porta ${PORT}`);
});
