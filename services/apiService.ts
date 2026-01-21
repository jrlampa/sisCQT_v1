import { Project, EngineResult, User, NetworkNode, ProjectParams } from '../types.ts';
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
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
        throw new Error("Sessão expirada");
      }
      if (!response.ok) throw new Error(`Erro API: ${response.status}`);
      return response.json();
    } catch (error) {
      console.error(`Falha na requisição ${path}:`, error);
      throw error;
    }
  }

  static async syncUser(accessToken: string): Promise<User> {
    const res = await this.request<{user: User}>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ token: accessToken })
    });
    localStorage.setItem(TOKEN_KEY, accessToken);
    return res.user;
  }

  static async me(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  }

  // --- Project CRUD (Backend First) ---
  static async getProjects(): Promise<Record<string, Project>> {
    const list = await this.request<Project[]>('/projects');
    return list.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
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

  // --- Engine Calls (Smart Backend) ---
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