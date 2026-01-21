
import { Project, EngineResult, NetworkNode, ProjectParams, User } from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'sisqat_auth_token';

export class ApiService {
  private static isMockMode = false;

  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    if (this.isMockMode) throw new Error("Mock Mode Active");
    
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && path !== '/auth/login') {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  // --- AUTH METHODS ---

  static async login(email: string, password: string): Promise<User> {
    const res = await this.request<{ token: string, user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(TOKEN_KEY, res.token);
    return res.user;
  }

  static async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  static async me(): Promise<User> {
    return await this.request<User>('/auth/me');
  }

  // --- PROJECT METHODS ---

  static async getProjects(): Promise<Record<string, Project>> {
    try {
      // Em uma implementação real, o backend filtraria projetos por userId baseado no token
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
    try {
      return await this.request<EngineResult>('/calculate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
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
