
import express from 'express';
import { ElectricalEngine } from './services/electricalEngine';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Mock Database de Usuários (Persistência em memória para o protótipo)
const USERS = [
  { id: 'u1', name: 'Jonatas Lampa', email: 'jonatas.lampa@im3brasil.com.br', plan: 'Enterprise', role: 'admin', password: 'admin-password' },
  { id: 'u2', name: 'Engenheiro Teste', email: 'teste@im3brasil.com.br', plan: 'Pro', role: 'user', password: 'teste123' }
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
  if (!email || !password) return res.status(400).json({ error: 'Dados incompletos' });
  
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (user) {
    const token = `tk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { password: _, ...userProfile } = user;
    SESSIONS.set(token, userProfile);
    res.json({ token, user: userProfile });
  } else {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
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

// --- ENGINE ENDPOINTS ---

app.post('/api/calculate', (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  
  // Validação básica de segurança (Prevenir ciclos)
  if (!nodes || nodes.length === 0) return res.status(400).json({ error: 'Lista de nós vazia' });
  
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: 'Erro crítico no processamento Theseus' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const { prompt, context } = req.body;
  if (!process.env.API_KEY) return res.status(500).json({ error: 'AI_KEY não configurada' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `CONTEXTO TÉCNICO DA REDE BT:\n${JSON.stringify(context || {})} \n\nSOLICITAÇÃO DO ENGENHEIRO:\n${prompt}`,
      config: {
        systemInstruction: `Você é "Theseus Core", a IA sênior da IM3 Brasil especialista em redes de distribuição de baixa tensão.
        REGRAS:
        1. Baseie-se nas normas NBR 5410 (Instalações) e PRODIST Módulo 8 (Qualidade de Energia).
        2. Seja direto, técnico e utilize termos como "Vão", "Ramal de Ligação", "CQT", "DMDI".
        3. Identifique imediatamente se houver sobrecarga (>100%) ou queda de tensão (>6%).
        4. Sugira condutores específicos do catálogo IM3 quando identificar gargalos.
        5. Formate as respostas em Markdown técnico para fácil leitura.`,
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error('AI error:', error);
    res.status(500).json({ error: 'O motor cognitivo Theseus está temporariamente indisponível' });
  }
});

app.listen(PORT, () => {
  console.log(`>>> sisCQT Enterprise Backend Online na porta ${PORT}`);
});
