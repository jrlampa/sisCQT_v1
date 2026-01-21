
import { Project, EngineResult, NetworkNode, ProjectParams, User } from '../types';
import { GeminiService } from './geminiService';

const API_BASE = '/api';
const TOKEN_KEY = 'sisqat_auth_token';

export class ApiService {
  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
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

  // Novo método para validar o token da Microsoft no nosso backend e obter o perfil do usuário
  static async syncUser(accessToken: string): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error("Acesso negado: Verifique seu domínio corporativo.");
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, accessToken); // Usamos o próprio token da MS para as próximas chamadas
    return data.user;
  }

  static async me(): Promise<User> {
    return await this.request<User>('/auth/me');
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
  }

  static async calculateScenario(payload: any): Promise<EngineResult> {
    return await this.request<EngineResult>('/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async createNode(node: any): Promise<void> {
    return await this.request('/nodes', {
      method: 'POST',
      body: JSON.stringify(node),
    });
  }

  // Fix: Implementation of missing getProjects method to retrieve saved projects
  static async getProjects(): Promise<Record<string, Project>> {
    const projects = localStorage.getItem('sisqat_enterprise_hub_v5');
    return projects ? JSON.parse(projects) : {};
  }

  // Fix: Implementation of missing saveProject method to persist project data
  static async saveProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    projects[project.id] = project;
    localStorage.setItem('sisqat_enterprise_hub_v5', JSON.stringify(projects));
  }

  // Fix: Implementation of missing askAI method to handle engineering AI queries via GeminiService
  static async askAI(prompt: string, context: any): Promise<string> {
    return GeminiService.askEngineeringQuestion(prompt, context);
  }
}
