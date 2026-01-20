
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  private static getAI() {
    // DO: Initialize Gemini API using named parameter and process.env.API_KEY
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async askEngineeringQuestion(prompt: string, context?: any): Promise<string> {
    const ai = this.getAI();
    const systemInstruction = `Você é o "Theseus", um engenheiro sênior especialista em redes de distribuição da IM3 Brasil.
    
    INSTRUÇÕES:
    1. Analise os dados do Motor de Cálculo (Theseus 3.1) fornecidos no contexto.
    2. Identifique pontos críticos (CQT > 6% ou sobrecarga > 100%).
    3. Sugira upgrade de cabos ou reconfiguração de topologia conforme normas PRODIST.
    4. Seja técnico, preciso e utilize terminologia de engenharia elétrica brasileira.
    5. Como estamos em modo Scale-up, foque em soluções de melhor custo-benefício.`;
    
    try {
      // DO: Use gemini-3-pro-preview for complex STEM engineering tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', 
        contents: `CONTEXTO TÉCNICO: ${JSON.stringify(context || {})} \n\nPERGUNTA: ${prompt}`,
        config: { 
          systemInstruction,
          temperature: 0.1 
        }
      });
      // DO: Access text output using .text property on response object
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
    const ai = this.getAI();
    const prompt = `Analise esta foto de infraestrutura de rede elétrica e forneça um relatório técnico...`;
    try {
      const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
      // DO: Use gemini-3-pro-preview for complex multi-modal reasoning tasks
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [imagePart, { text: prompt }] },
      });
      return response.text || "Não foi possível realizar a identificação visual.";
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      return "Falha ao processar análise visual.";
    }
    */
  }
}
