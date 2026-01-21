
import { Project, EngineResult, User } from '../types.ts';
import { GeminiService } from './geminiService.ts';

const API_BASE = '/api';
const TOKEN_KEY = 'sisqat_auth_token';
const MOCK_USER_KEY = 'sisqat_mock_user';

// Detecção de ambiente para habilitar mocks automaticamente se necessário
const IS_PREVIEW = window.location.hostname === 'localhost' || 
                   window.location.hostname.includes('stackblitz') || 
                   window.location.hostname.includes('webcontainer') ||
                   window.location.hostname.includes('run.app') ||
                   window.location.hostname.includes('gemini');

export class ApiService {
  /**
   * Wrapper universal para requisições à API com injeção de Bearer Token.
   */
  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    
    // Fallback de usuário para modo offline/preview
    if ((token === 'dev-token-im3' || IS_PREVIEW) && path === '/auth/me') {
      const mockUser = localStorage.getItem(MOCK_USER_KEY);
      if (mockUser) return JSON.parse(mockUser) as T;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Injeção do token de autenticação
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout para redes instáveis

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Tratamento de sessão expirada ou não autorizada
      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/sync') {
        this.logout();
        window.location.href = '/login';
        throw new Error("Sessão expirada");
      }

      // Fallback para falha do servidor no preview
      if (response.status === 404 && IS_PREVIEW) {
         throw new Error("SERVER_OFFLINE");
      }

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Se estivermos em modo teste/dev, simulamos o sucesso das operações críticas
      if (IS_PREVIEW || token === 'dev-token-im3') {
        if (path === '/auth/me') {
          return JSON.parse(localStorage.getItem(MOCK_USER_KEY) || 'null') as T;
        }
        if (path === '/calculate') {
           // Executa o motor elétrico localmente se o backend falhar
           const { ElectricalEngine } = await import('./electricalEngine.ts');
           const body = JSON.parse(options?.body as string);
           return ElectricalEngine.calculate(body.scenarioId, body.nodes, body.params, body.cables, body.ips) as any;
        }
      }
      throw error;
    }
  }

  /**
   * Sincroniza o token recebido da Azure com o banco de dados da aplicação.
   */
  static async syncUser(accessToken: string): Promise<User> {
    const devUser: User = {
      id: 'dev-user-01',
      name: 'Engenheiro (Modo Preview)',
      email: 'teste@im3brasil.com.br',
      plan: 'Enterprise',
      role: 'admin'
    };

    // Caso seja o token especial de dev
    if (accessToken === 'dev-token-im3') {
      localStorage.setItem(TOKEN_KEY, 'dev-token-im3');
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(devUser));
      return devUser;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/sync`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (!res.ok) throw new Error("Acesso negado: Domínio corporativo inválido.");
      
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (e) {
      // Se houver erro de rede no preview, permitimos o acesso como guest
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
