
import { Project, EngineResult, User } from '../types.ts';
import { GeminiService } from './geminiService.ts';

const API_BASE = '/api';
const TOKEN_KEY = 'sisqat_auth_token';
const MOCK_USER_KEY = 'sisqat_mock_user';

const IS_PREVIEW = window.location.hostname === 'localhost' || 
                   window.location.hostname.includes('stackblitz') || 
                   window.location.hostname.includes('webcontainer') ||
                   window.location.hostname.includes('run.app') ||
                   window.location.hostname.includes('gemini');

export class ApiService {
  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if ((token === 'dev-token-im3' || IS_PREVIEW) && path === '/auth/me') {
      const mockUser = localStorage.getItem(MOCK_USER_KEY);
      if (mockUser) return JSON.parse(mockUser) as T;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // 404 em ambiente de preview geralmente significa que o backend não está rodando
      if (response.status === 404 && IS_PREVIEW) {
         throw new Error("SERVER_OFFLINE");
      }

      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/sync') {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (IS_PREVIEW || token === 'dev-token-im3') {
        if (path === '/auth/me') {
          return JSON.parse(localStorage.getItem(MOCK_USER_KEY) || 'null') as T;
        }
        if (path === '/calculate') {
           const { ElectricalEngine } = await import('./electricalEngine.ts');
           const body = JSON.parse(options?.body as string);
           return ElectricalEngine.calculate(body.scenarioId, body.nodes, body.params, body.cables, body.ips) as any;
        }
      }
      throw error;
    }
  }

  static async syncUser(accessToken: string): Promise<User> {
    const devUser: User = {
      id: 'dev-user-01',
      name: 'Engenheiro (Modo Preview)',
      email: 'teste@im3brasil.com.br',
      plan: 'Enterprise',
      role: 'admin'
    };

    if (accessToken === 'dev-token-im3' || IS_PREVIEW) {
      localStorage.setItem(TOKEN_KEY, 'dev-token-im3');
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(devUser));
      return devUser;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) throw new Error("Acesso negado");
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (e) {
      if (IS_PREVIEW) {
        localStorage.setItem(TOKEN_KEY, 'dev-token-im3');
        localStorage.setItem(MOCK_USER_KEY, JSON.stringify(devUser));
        return devUser;
      }
      throw e;
    }
  }

  static async me(): Promise<User> {
    return await this.request<User>('/auth/me');
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MOCK_USER_KEY);
  }

  static async calculateScenario(payload: any): Promise<EngineResult> {
    return await this.request<EngineResult>('/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getProjects(): Promise<Record<string, Project>> {
    const projects = localStorage.getItem('sisqat_enterprise_hub_v5');
    return projects ? JSON.parse(projects) : {};
  }

  static async saveProject(project: Project): Promise<void> {
    const projects = await this.getProjects();
    projects[project.id] = project;
    localStorage.setItem('sisqat_enterprise_hub_v5', JSON.stringify(projects));
  }

  static async askAI(prompt: string, context: any): Promise<string> {
    return GeminiService.askEngineeringQuestion(prompt, context);
  }
}
