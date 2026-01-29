/**
 * Connectivity Manager - Detecta e monitora status de conectividade
 * Para uso em modo desktop híbrido (online/offline)
 */

type ConnectivityStatus = 'online' | 'offline' | 'checking';

interface ConnectivityInfo {
  online: boolean;
  latency: number | null;
  lastChecked: Date;
}

type ConnectivityListener = (online: boolean) => void;

class ConnectivityManager {
  private status: ConnectivityStatus = 'checking';
  private listeners: Set<ConnectivityListener> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date = new Date();
  private currentLatency: number | null = null;

  constructor(private intervalMs: number = 30000) {
    this.startMonitoring();
  }

  /**
   * Verifica se há conectividade com a internet
   */
  async isOnline(): Promise<boolean> {
    // Primeiro, verifica o navigator.onLine (rápido mas não confiável)
    if (!navigator.onLine) {
      this.updateStatus('offline');
      return false;
    }

    // Tenta fazer uma requisição real para confirmar
    try {
      const result = await this.checkConnection();
      this.updateStatus(result.online ? 'online' : 'offline');
      return result.online;
    } catch {
      this.updateStatus('offline');
      return false;
    }
  }

  /**
   * Verifica conectividade fazendo ping em um endpoint confiável
   */
  async checkConnection(): Promise<ConnectivityInfo> {
    const startTime = performance.now();

    try {
      // Tenta acessar um endpoint leve e confiável
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      this.currentLatency = latency;
      this.lastCheckTime = new Date();

      return {
        online: response.ok,
        latency,
        lastChecked: this.lastCheckTime,
      };
    } catch {
      this.currentLatency = null;
      this.lastCheckTime = new Date();

      return {
        online: false,
        latency: null,
        lastChecked: this.lastCheckTime,
      };
    }
  }

  /**
   * Registra um listener para mudanças de status
   */
  onStatusChange(callback: ConnectivityListener): () => void {
    this.listeners.add(callback);

    // Retorna função de cleanup
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Inicia monitoramento periódico
   */
  private startMonitoring(): void {
    // Check inicial
    void this.isOnline();

    // Listener do navegador (backup rápido)
    window.addEventListener('online', () => {
      this.updateStatus('online');
      void this.isOnline(); // Confirma com check real
    });

    window.addEventListener('offline', () => {
      this.updateStatus('offline');
    });

    // Check periódico
    this.checkInterval = setInterval(() => {
      void this.isOnline();
    }, this.intervalMs);
  }

  /**
   * Para o monitoramento
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Atualiza status e notifica listeners
   */
  private updateStatus(newStatus: ConnectivityStatus): void {
    const wasOnline = this.status === 'online';
    const isOnline = newStatus === 'online';

    this.status = newStatus;

    // Notifica apenas se houve mudança real
    if (wasOnline !== isOnline) {
      this.notifyListeners(isOnline);
    }
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.error('[ConnectivityManager] Error in listener:', error);
      }
    });
  }

  /**
   * Retorna informações atuais de conectividade
   */
  getInfo(): ConnectivityInfo {
    return {
      online: this.status === 'online',
      latency: this.currentLatency,
      lastChecked: this.lastCheckTime,
    };
  }

  /**
   * Retorna status atual
   */
  getStatus(): ConnectivityStatus {
    return this.status;
  }
}

// Singleton instance
let connectivityInstance: ConnectivityManager | null = null;

export function getConnectivityManager(): ConnectivityManager {
  if (!connectivityInstance) {
    connectivityInstance = new ConnectivityManager();
  }
  return connectivityInstance;
}

export { ConnectivityManager };
export type { ConnectivityStatus, ConnectivityInfo, ConnectivityListener };
