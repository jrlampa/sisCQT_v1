
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ElectricalEngine } from './services/electricalEngine';
import { gisController } from './controllers/gisController';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Mock Database de Usuários - Agora com usuário de teste solicitado
const USERS = [
  { id: 'u1', name: 'Jonatas Lampa', email: 'jonatas.lampa@im3brasil.com.br', plan: 'Enterprise', role: 'admin', password: 'admin-password' },
  { id: 'u2', name: 'Usuário Teste', email: 'teste@im3brasil.com.br', plan: 'Enterprise', role: 'admin', password: '123' }
];

const SESSIONS = new Map<string, any>();

// --- MIDDLEWARE DE LOG ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API ENDPOINTS ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === String(password));
  
  if (user) {
    const token = `tk-${Date.now()}`;
    const { password: _, ...userProfile } = user;
    SESSIONS.set(token, userProfile);
    res.json({ token, user: userProfile });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && SESSIONS.has(token)) {
    res.json(SESSIONS.get(token));
  } else {
    res.status(401).json({ error: 'Não autorizado' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) SESSIONS.delete(token);
  res.json({ success: true });
});

app.get('/api/nodes', gisController.getNodes);
app.post('/api/nodes', gisController.createNode);

app.post('/api/calculate', (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no processamento do motor elétrico' });
  }
});

// --- SERVIÇO DE ARQUIVOS ESTÁTICOS ---
app.use(express.static(__dirname));

// --- ROTA CATCH-ALL (SPA) ---
// Qualquer rota que não seja API ou arquivo físico deve retornar o index.html
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint de API não encontrado' });
  }
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`>>> sisCQT Enterprise AI Backend rodando na porta ${PORT}`);
  console.log(`>>> Usuário teste liberado: teste@im3brasil.com.br / 123`);
});
