import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private static getAI() {
    // O SDK lê `GEMINI_API_KEY` automaticamente do ambiente quando inicializado com `{}`.
    return new GoogleGenAI({});
  }

  static async askEngineeringQuestion(prompt: string, context?: any): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    const ai = this.getAI();
    const systemInstruction = `Você é o "Theseus", um engenheiro sênior especialista em redes de distribuição da IM3 Brasil.
    
    INSTRUÇÕES:
    1. Analise os dados do Motor de Cálculo (Theseus 3.1) fornecidos no contexto.
    2. Identifique pontos críticos (CQT > 6% ou sobrecarga > 100%).
    3. Sugira upgrade de cabos ou reconfiguração de topologia conforme normas PRODIST.
    4. Seja técnico, preciso e utilize terminologia de engenharia elétrica brasileira.
    5. Como estamos em modo Scale-up, foque em soluções de melhor custo-benefício.`;
    
    try {
      const fullPrompt = `CONTEXTO TÉCNICO: ${JSON.stringify(context || {})} \n\nPERGUNTA: ${prompt}`;
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          systemInstruction,
        },
      });
      return response.text || "Sem resposta do motor de IA.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "Erro na comunicação com a IA.";
    }
  }

  static async analyzeInfrastructureImage(base64Image: string): Promise<string> {
    // DESATIVADO PARA ECONOMIA DE CRÉDITOS - MANTENDO ESTRUTURA PARA FUTURO
    return "A funcionalidade de análise de imagem está temporariamente desativada para manutenção e otimização de custos (Modo Scale-up). Entre em contato com o administrador para mais informações.";
    
    /* 
    // Código preservado para futura reativação
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the server.");
    }
    const ai = this.getAI(apiKey);
    const prompt = `Analise esta foto de infraestrutura de rede elétrica e forneça um relatório técnico...`;
    try {
      const model = ai.getGenerativeModel({ model: "gemini-pro-vision" });
      const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
      const result = await model.generateContent([prompt, imagePart]);
      const response = result.response;
      return response.text() || "Não foi possível realizar a identificação visual.";
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      return "Falha ao processar análise visual.";
    }
    */
  }
}
