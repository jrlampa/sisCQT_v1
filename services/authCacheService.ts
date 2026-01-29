/**
 * Auth Cache Service - Gerencia cache seguro de tokens de autenticação
 * Para permitir "Manter-me conectado" em modo desktop
 */

const AUTH_CACHE_KEY = 'sisCQT_auth_cache';
const TOKEN_EXPIRY_DAYS = 30;

interface CachedAuth {
  token: string;
  expiresAt: number;
  remember: boolean;
  userInfo?: {
    email: string;
    name?: string;
  };
}

class AuthCacheService {
  private isDesktop: boolean;

  constructor() {
    this.isDesktop = typeof window !== 'undefined' && window.sisCQT?.isDesktop === true;
  }

  /**
   * Salva token no cache com opção de "remember me"
   */
  async saveToken(token: string, remember: boolean, userInfo?: { email: string; name?: string }): Promise<void> {
    const expiresAt = remember
      ? Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      : Date.now() + 24 * 60 * 60 * 1000; // 24h se não remember

    const cacheData: CachedAuth = {
      token,
      expiresAt,
      remember,
      userInfo,
    };

    if (this.isDesktop) {
      // Em desktop, usar localStorage (electron safeStorage será implementado depois)
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));
    } else {
      // Em web, usar sessionStorage ou localStorage baseado em remember
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));
    }
  }

  /**
   * Recupera token do cache
   */
  async getToken(): Promise<string | null> {
    try {
      let cacheStr: string | null = null;

      if (this.isDesktop) {
        cacheStr = localStorage.getItem(AUTH_CACHE_KEY);
      } else {
        // Tenta localStorage primeiro, depois sessionStorage
        cacheStr = localStorage.getItem(AUTH_CACHE_KEY) || sessionStorage.getItem(AUTH_CACHE_KEY);
      }

      if (!cacheStr) return null;

      const cache: CachedAuth = JSON.parse(cacheStr);

      // Verifica se expirou
      if (Date.now() > cache.expiresAt) {
        await this.clearToken();
        return null;
      }

      return cache.token;
    } catch (error) {
      console.error('[AuthCacheService] Error getting token:', error);
      return null;
    }
  }

  /**
   * Limpa o cache de autenticação
   */
  async clearToken(): Promise<void> {
    if (this.isDesktop) {
      localStorage.removeItem(AUTH_CACHE_KEY);
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
      sessionStorage.removeItem(AUTH_CACHE_KEY);
    }
  }

  /**
   * Verifica se o token em cache é válido
   */
  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  /**
   * Recupera informações do usuário do cache
   */
  async getUserInfo(): Promise<{ email: string; name?: string } | null> {
    try {
      let cacheStr: string | null = null;

      if (this.isDesktop) {
        cacheStr = localStorage.getItem(AUTH_CACHE_KEY);
      } else {
        cacheStr = localStorage.getItem(AUTH_CACHE_KEY) || sessionStorage.getItem(AUTH_CACHE_KEY);
      }

      if (!cacheStr) return null;

      const cache: CachedAuth = JSON.parse(cacheStr);

      if (Date.now() > cache.expiresAt) {
        await this.clearToken();
        return null;
      }

      return cache.userInfo || null;
    } catch (error) {
      console.error('[AuthCacheService] Error getting user info:', error);
      return null;
    }
  }

  /**
   * Atualiza tempo de expiração (refresh)
   */
  async refreshToken(): Promise<void> {
    try {
      let cacheStr: string | null = null;

      if (this.isDesktop) {
        cacheStr = localStorage.getItem(AUTH_CACHE_KEY);
      } else {
        cacheStr = localStorage.getItem(AUTH_CACHE_KEY) || sessionStorage.getItem(AUTH_CACHE_KEY);
      }

      if (!cacheStr) return;

      const cache: CachedAuth = JSON.parse(cacheStr);

      // Estende expiração
      cache.expiresAt = cache.remember
        ? Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        : Date.now() + 24 * 60 * 60 * 1000;

      if (this.isDesktop) {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
      } else {
        const storage = cache.remember ? localStorage : sessionStorage;
        storage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
      }
    } catch (error) {
      console.error('[AuthCacheService] Error refreshing token:', error);
    }
  }
}

// Singleton instance
let authCacheInstance: AuthCacheService | null = null;

export function getAuthCacheService(): AuthCacheService {
  if (!authCacheInstance) {
    authCacheInstance = new AuthCacheService();
  }
  return authCacheInstance;
}

export { AuthCacheService };
export type { CachedAuth };
