import { Project, EngineResult, User, NetworkNode } from '../types.ts';
import { GeminiService } from './geminiService.ts';

const API_BASE = '/api';
const TOKEN_KEY = 'sisqat_auth_token';

export class ApiService {
  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
      
      if (response.status === 401) {
        if (!window.location.pathname.includes('/login')) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = '/login';
        }
        throw new Error("Sessão expirada");
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro API: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`Falha na requisição ${path}:`, error);
      throw error;
    }
  }

  static async syncUser(accessToken: string): Promise<User> {
    localStorage.setItem(TOKEN_KEY, accessToken);
    const res = await this.request<{user: User}>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ token: accessToken })
    });
    return res.user;
  }

  static async me(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  }

  static async getProjects(): Promise<Record<string, Project>> {
    const list = await this.request<Project[]>('/projects');
    return (list || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }

  static async saveProject(project: Project): Promise<void> {
    await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }

  static async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  static async calculateScenario(payload: any): Promise<EngineResult> {
    return this.request<EngineResult>('/calculate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async optimizeScenario(payload: any): Promise<NetworkNode[]> {
    return this.request<NetworkNode[]>('/optimize', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async askAI(prompt: string, context: any): Promise<string> {
    return GeminiService.askEngineeringQuestion(prompt, context);
  }
}