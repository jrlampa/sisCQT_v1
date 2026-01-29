/**
 * Map Cache Service - Cache offline-first para tiles de mapas OSM
 * Usa IndexedDB para armazenamento persistente com estratégia LRU
 */

const DB_NAME = 'sisCQT_MapCache';
const STORE_NAME = 'tiles';
const DB_VERSION = 1;
const MAX_CACHE_SIZE_MB = 500;
const MAX_CACHE_SIZE_BYTES = MAX_CACHE_SIZE_MB * 1024 * 1024;

interface TileData {
  key: string;
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

class MapCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private currentCacheSize = 0;

  constructor() {
    this.initPromise = this.init();
  }

  /**
   * Inicializa IndexedDB
   */
  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.calculateCacheSize().then(() => resolve());
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });
  }

  /**
   * Gera chave única para tile
   */
  private getTileKey(z: number, x: number, y: number): string {
    return `${z}/${x}/${y}`;
  }

  /**
   * Busca tile do cache ou da rede (cache-first)
   */
  async getTile(z: number, x: number, y: number, tileUrl: string): Promise<Blob | null> {
    await this.initPromise;
    if (!this.db) return null;

    const key = this.getTileKey(z, x, y);

    // Tenta buscar do cache primeiro
    const cached = await this.getFromCache(key);
    if (cached) {
      // Atualiza access count e lastAccessed
      await this.updateAccessInfo(key);
      return cached.blob;
    }

    // Se não está no cache, busca da rede
    try {
      const response = await fetch(tileUrl);
      if (!response.ok) return null;

      const blob = await response.blob();

      // Salva no cache para uso futuro
      await this.saveTile(z, x, y, tileUrl, blob);

      return blob;
    } catch (error) {
      console.error('[MapCache] Error fetching tile:', error);
      return null;
    }
  }

  /**
   * Salva tile no cache
   */
  async saveTile(z: number, x: number, y: number, url: string, blob: Blob): Promise<void> {
    await this.initPromise;
    if (!this.db) return;

    const key = this.getTileKey(z, x, y);
    const size = blob.size;

    // Verifica se precisa liberar espaço
    if (this.currentCacheSize + size > MAX_CACHE_SIZE_BYTES) {
      await this.evictOldTiles(size);
    }

    const tileData: TileData = {
      key,
      url,
      blob,
      timestamp: Date.now(),
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(tileData);

      request.onsuccess = () => {
        this.currentCacheSize += size;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca tile do cache
   */
  private async getFromCache(key: string): Promise<TileData | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Atualiza informações de acesso (LRU)
   */
  private async updateAccessInfo(key: string): Promise<void> {
    if (!this.db) return;

    const tile = await this.getFromCache(key);
    if (!tile) return;

    tile.accessCount++;
    tile.lastAccessed = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(tile);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove tiles antigos usando estratégia LRU
   */
  private async evictOldTiles(neededSpace: number): Promise<void> {
    if (!this.db) return;

    // Busca todos os tiles ordenados por último acesso
    const tiles = await this.getAllTiles();
    tiles.sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    const tilesToRemove: string[] = [];

    for (const tile of tiles) {
      if (freedSpace >= neededSpace) break;
      tilesToRemove.push(tile.key);
      freedSpace += tile.size;
    }

    // Remove tiles selecionados
    for (const key of tilesToRemove) {
      await this.removeTile(key);
    }
  }

  /**
   * Busca todos os tiles do cache
   */
  private async getAllTiles(): Promise<TileData[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove tile específico do cache
   */
  private async removeTile(key: string): Promise<void> {
    if (!this.db) return;

    const tile = await this.getFromCache(key);
    if (!tile) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        this.currentCacheSize -= tile.size;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Calcula tamanho total do cache
   */
  private async calculateCacheSize(): Promise<void> {
    const tiles = await this.getAllTiles();
    this.currentCacheSize = tiles.reduce((sum, tile) => sum + tile.size, 0);
  }

  /**
   * Limpa todo o cache
   */
  async clearCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        this.currentCacheSize = 0;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retorna estatísticas do cache
   */
  async getStats(): Promise<{ size: number; count: number; sizeMB: number }> {
    const tiles = await this.getAllTiles();
    return {
      size: this.currentCacheSize,
      sizeMB: this.currentCacheSize / (1024 * 1024),
      count: tiles.length,
    };
  }

  /**
   * Pré-carrega tiles de uma região
   */
  async preloadRegion(
    centerLat: number,
    centerLng: number,
    zoom: number,
    radius: number = 2,
    tileUrlTemplate: string = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  ): Promise<void> {
    // Converte lat/lng para tile coordinates
    const centerTile = this.latLngToTile(centerLat, centerLng, zoom);

    const promises: Promise<void>[] = [];

    // Pré-carrega tiles em um quadrado ao redor do centro
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = centerTile.x + dx;
        const y = centerTile.y + dy;

        if (x < 0 || y < 0 || x >= Math.pow(2, zoom) || y >= Math.pow(2, zoom)) {
          continue;
        }

        const url = tileUrlTemplate
          .replace('{z}', zoom.toString())
          .replace('{x}', x.toString())
          .replace('{y}', y.toString());

        promises.push(
          this.getTile(zoom, x, y, url).then(() => { })
        );
      }
    }

    await Promise.allSettled(promises);
  }

  /**
   * Converte lat/lng para tile coordinates
   */
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor(
      (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
    );
    return { x, y };
  }
}

// Singleton instance
let mapCacheInstance: MapCacheService | null = null;

export function getMapCacheService(): MapCacheService {
  if (!mapCacheInstance) {
    mapCacheInstance = new MapCacheService();
  }
  return mapCacheInstance;
}

export { MapCacheService };
export type { TileData };
