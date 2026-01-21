
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
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`>>> sisCQT Enterprise AI: Backend Seguro rodando na porta ${PORT}`);
});
