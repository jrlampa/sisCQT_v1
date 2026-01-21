
import express from 'express';
import { ElectricalEngine } from './services/electricalEngine';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Motor de Cálculo no Servidor
app.post('/api/calculate', (req, res) => {
  const { scenarioId, nodes, params, cables, ips } = req.body;
  try {
    const result = ElectricalEngine.calculate(scenarioId, nodes, params, cables, ips);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erro no cálculo Theseus' });
  }
});

// IA Theseus Protegida no Servidor
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, context } = req.body;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `CONTEXTO TÉCNICO: ${JSON.stringify(context || {})} \n\nPERGUNTA: ${prompt}`,
      config: {
        systemInstruction: "Você é o 'Theseus', engenheiro sênior IM3 Brasil. Use normas PRODIST/ABNT.",
        temperature: 0.1
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: 'Erro no motor cognitivo' });
  }
});

// Em um ambiente real, aqui teríamos rotas de Banco de Dados (PostgreSQL/MongoDB)
// Para o protótipo, o frontend continua enviando o estado completo do projeto.

app.listen(PORT, () => {
  console.log(`sisCQT Backend rodando na porta ${PORT}`);
});
