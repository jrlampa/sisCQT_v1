
import { Project, EngineResult, NetworkNode, ProjectParams } from '../types';

const API_BASE = '/api';

export class ApiService {
  private static isMockMode = false; // Pode ser alterado para false quando o Node estiver rodando

  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    if (this.isMockMode) throw new Error("Mock Mode Active");
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  static async getProjects(): Promise<Record<string, Project>> {
    try {
      return await this.request<Record<string, Project>>('/projects');
    } catch {
      const saved = localStorage.getItem('sisqat_enterprise_hub_v5');
      return saved ? JSON.parse(saved) : {};
    }
  }

  static async saveProject(project: Project): Promise<void> {
    try {
      await this.request('/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      });
    } catch {
      const hub = JSON.parse(localStorage.getItem('sisqat_enterprise_hub_v5') || '{}');
      hub[project.id] = project;
      localStorage.setItem('sisqat_enterprise_hub_v5', JSON.stringify(hub));
    }
  }

  static async calculateScenario(payload: {
    scenarioId: string;
    nodes: NetworkNode[];
    params: ProjectParams;
    cables: any;
    ips: any;
  }): Promise<EngineResult> {
    // Tenta backend, se falhar ou estiver em mock, usa o motor local (que já temos)
    try {
      return await this.request<EngineResult>('/calculate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Importação dinâmica do motor local para manter funcionalidade offline
      const { ElectricalEngine } = await import('./electricalEngine');
      return ElectricalEngine.calculate(
        payload.scenarioId,
        payload.nodes,
        payload.params,
        payload.cables,
        payload.ips
      );
    }
  }

  static async askAI(prompt: string, context: any): Promise<string> {
    try {
      const res = await this.request<{ text: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ prompt, context }),
      });
      return res.text;
    } catch {
      const { GeminiService } = await import('./geminiService');
      return GeminiService.askEngineeringQuestion(prompt, context);
    }
  }
}
