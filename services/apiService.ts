import { Project, EngineResult, User, NetworkNode, MonteCarloResult } from '../types.ts';

const API_BASE = '/api';
const TOKEN_KEY = 'sisqat_auth_token';
const DEFAULT_TIMEOUT_MS = 15000;

export interface ApiConstants {
  cables: Project['cables'];
  ipTypes: Project['ipTypes'];
  dmdiTables: Record<string, any[]>;
  profiles: Record<string, any>;
}

export class ApiError extends Error {
  status: number;
  details?: any;
  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export class ApiService {
  private static constantsCache: ApiConstants | null = null;
  private static constantsPromise: Promise<ApiConstants> | null = null;

  private static notifyAuthChanged() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sisqat_auth_changed'));
    }
  }

  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem(TOKEN_KEY);
    const isFormData =
      typeof FormData !== 'undefined' &&
      options?.body !== undefined &&
      options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutMs = typeof (options as any)?.timeoutMs === 'number' ? (options as any).timeoutMs : DEFAULT_TIMEOUT_MS;
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    // Se o caller passar um signal, repassamos o cancelamento.
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
      
      if (response.status === 401) {
        if (!window.location.pathname.includes('/login')) {
            localStorage.removeItem(TOKEN_KEY);
            this.notifyAuthChanged();
            window.location.href = '/login';
        }
        throw new ApiError("Sessão expirada", 401);
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        throw new ApiError(
          errorData.error || `Erro API: ${response.status}`,
          response.status,
          errorData.details ?? null
        );
      }

      if (response.status === 204) {
        return Promise.resolve({} as T);
      }
      
      return response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Timeout na requisição', 408);
      }
      console.error(`Falha na requisição ${path}:`, error);
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  static async syncUser(accessToken: string): Promise<User> {
    localStorage.setItem(TOKEN_KEY, accessToken);
    this.notifyAuthChanged();
    const res = await this.request<{user: User}>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({ token: accessToken })
    });
    return res.user;
  }

  static async me(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  static async getConstants(): Promise<ApiConstants> {
    if (this.constantsCache) return this.constantsCache;
    if (this.constantsPromise) return this.constantsPromise;

    this.constantsPromise = this.request<ApiConstants>('/constants')
      .then((c) => {
        this.constantsCache = c;
        return c;
      })
      .finally(() => {
        this.constantsPromise = null;
      });

    return this.constantsPromise;
  }

  static async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY);
    this.notifyAuthChanged();
  }

  static async getProjects(): Promise<Record<string, Project>> {
    const list = await this.request<Project[]>('/projects');
    return (list || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
  }

  static async createProject(project: Project): Promise<Project> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }

  static async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
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

  static async importXlsx(file: File, name?: string): Promise<{ projectId: string; project: Project; debug?: any }> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (name) fd.append('name', name);

    return this.request<{ projectId: string; project: Project; debug?: any }>('/import/xlsx', {
      method: 'POST',
      body: fd as any,
      // imports podem demorar dependendo do tamanho do XLSX
      // @ts-ignore
      timeoutMs: 60000,
    } as any);
  }

  static async billingStatus(): Promise<{ plan: User['plan']; authProvider?: User['authProvider']; subscription: any | null }> {
    return this.request('/billing/status', { method: 'GET' });
  }

  static async billingCheckout(): Promise<{ url: string | null }> {
    return this.request<{ url: string | null }>('/billing/checkout', { method: 'POST' });
  }

  static async billingPortal(): Promise<{ url: string | null }> {
    return this.request<{ url: string | null }>('/billing/portal', { method: 'POST' });
  }

  static async runMonteCarlo(payload: {
    scenarioId: string;
    nodes: any[];
    params: any;
    cables: any;
    ips: any;
    iterations?: number;
    seed?: string | number;
  }): Promise<MonteCarloResult> {
    return this.request<MonteCarloResult>('/montecarlo', {
      method: 'POST',
      body: JSON.stringify(payload),
      // Monte Carlo pode ser mais pesado; aumentamos timeout.
      // @ts-ignore
      timeoutMs: 60000,
    } as any);
  }

  static async askAI(prompt: string, context: any): Promise<string> {
    const response = await this.request<{ result: string }>('/gemini/ask', {
      method: 'POST',
      body: JSON.stringify({ prompt, context })
    });
    return response.result;
  }

  static async getGisNodes(): Promise<any> {
    return this.request<any>('/gis/nodes');
  }

  static async createGisNode(payload: { lat: number; lng: number; type: 'TRAFO' | 'POSTE'; name: string; properties?: Record<string, any> }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/gis/nodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}