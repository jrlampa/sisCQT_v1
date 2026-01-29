/**
 * Groq AI Service - Motor de IA gratuito para sisCQT Desktop
 * Substitui Gemini API para redução de custos
 */

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GroqService {
  private static readonly GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'llama-3.3-70b-versatile'; // Modelo gratuito e rápido

  /**
   * Faz pergunta de engenharia sobre rede elétrica
   */
  static async askEngineeringQuestion(prompt: string, context?: any): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.warn('[GroqService] API key não configurada');
      // Retorna resposta fallback básica
      return this.getFallbackResponse(prompt, context);
    }

    const systemInstruction = `Você é o "Theseus", um engenheiro sênior especialista em redes de distribuição da IM3 Brasil.
    
INSTRUÇÕES:
1. Analise os dados do Motor de Cálculo (Theseus 3.1) fornecidos no contexto.
2. Identifique pontos críticos (CQT > 6% ou sobrecarga > 100%).
3. Sugira upgrade de cabos ou reconfiguração de topologia conforme normas PRODIST.
4. Seja técnico, preciso e utilize terminologia de engenharia elétrica brasileira.
5. Foque em soluções de melhor custo-benefício.`;

    const messages: GroqMessage[] = [
      {
        role: 'system',
        content: systemInstruction,
      },
      {
        role: 'user',
        content: context
          ? `CONTEXTO TÉCNICO: ${JSON.stringify(context)}\n\nPERGUNTA: ${prompt}`
          : prompt,
      },
    ];

    try {
      const response = await fetch(this.GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || this.DEFAULT_MODEL,
          messages,
          temperature: 0.3, // Mais determinístico para engenharia
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[GroqService] API error:', response.status, error);
        return this.getFallbackResponse(prompt, context);
      }

      const data: GroqResponse = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.warn('[GroqService] Empty response from API');
        return this.getFallbackResponse(prompt, context);
      }

      return content;

    } catch (error) {
      console.error('[GroqService] Error:', error);
      return this.getFallbackResponse(prompt, context);
    }
  }

  /**
   * Resposta fallback quando offline ou erro na API
   * Usa regras básicas de engenharia para sugestões
   */
  private static getFallbackResponse(prompt: string, context?: any): string {
    // Analisa contexto para sugestões básicas
    if (context && context.sections) {
      const criticalSections = context.sections.filter((s: any) =>
        s.cqt > 6 || s.transformerLoad > 100
      );

      if (criticalSections.length > 0) {
        const suggestions: string[] = [];

        criticalSections.forEach((section: any) => {
          if (section.cqt > 6) {
            suggestions.push(
              `• Trecho ${section.id || 'sem ID'}: CQT de ${section.cqt.toFixed(2)}% excede limite. Considere:\n` +
              `  - Upgrade para cabo de maior seção (reduz resistência)\n` +
              `  - Redução do comprimento do trecho\n` +
              `  - Redistribuição de cargas`
            );
          }

          if (section.transformerLoad > 100) {
            suggestions.push(
              `• Transformador sobrecarregado (${section.transformerLoad.toFixed(1)}%): Necessário upgrade de potência`
            );
          }
        });

        return `**Análise Offline (Regras Básicas)**\n\n` +
          `Foram identificados ${criticalSections.length} ponto(s) crítico(s):\n\n` +
          suggestions.join('\n\n') +
          `\n\n_Nota: Esta é uma análise básica offline. Para sugestões otimizadas, conecte-se à internet._`;
      }
    }

    return `Para análises detalhadas com IA, é necessária conexão com a internet. ` +
      `No momento, você está offline ou a API Groq está indisponível.\n\n` +
      `Você ainda pode usar todas as funcionalidades de cálculo e design de rede. ` +
      `As sugestões de IA estarão disponíveis quando voltar online.`;
  }

  /**
   * Verifica se a API está disponível (health check)
   */
  static async isAvailable(): Promise<boolean> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return false;

    try {
      const response = await fetch(this.GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.DEFAULT_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
