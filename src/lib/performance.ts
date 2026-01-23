/**
 * Utility per Ottimizzazioni di Performance
 * 
 * Caching, debouncing, throttling e altre ottimizzazioni
 */

/**
 * Debounce: ritarda l'esecuzione di una funzione finché non passa un certo tempo senza chiamate
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle: limita la frequenza di esecuzione di una funzione
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoization: cache i risultati di una funzione basato sui parametri
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Cache con TTL (Time To Live)
 */
export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number }> = new Map();

  set(key: K, value: V, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) return undefined;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Batch processing: elabora elementi in batch per evitare sovraccarico
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayMs: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Delay tra batch per evitare sovraccarico
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Request deduplication: evita richieste duplicate contemporanee
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  async execute<T>(
    key: string,
    request: () => Promise<T>
  ): Promise<T> {
    // Se una richiesta con la stessa chiave è già in corso, aspetta il risultato
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Altrimenti, esegui la richiesta
    const promise = request()
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }
}

/**
 * Lazy loading: carica i dati solo quando necessario
 */
export class LazyLoader<T> {
  private data: T | null = null;
  private loading: Promise<T> | null = null;

  constructor(private loader: () => Promise<T>) {}

  async load(): Promise<T> {
    if (this.data !== null) {
      return this.data;
    }

    if (this.loading !== null) {
      return this.loading;
    }

    this.loading = this.loader()
      .then(data => {
        this.data = data;
        this.loading = null;
        return data;
      })
      .catch(error => {
        this.loading = null;
        throw error;
      });

    return this.loading;
  }

  isLoaded(): boolean {
    return this.data !== null;
  }

  clear() {
    this.data = null;
    this.loading = null;
  }
}

/**
 * Pagination helper: gestisce la paginazione dei dati
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
): PaginationState {
  return {
    page: Math.max(1, page),
    pageSize: Math.max(1, pageSize),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function getPaginationOffset(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

/**
 * Sorting helper: gestisce l'ordinamento dei dati
 */
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

export function sortData<T>(
  data: T[],
  field: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });
}

/**
 * Filtering helper: gestisce il filtraggio dei dati
 */
export function filterData<T>(
  data: T[],
  predicate: (item: T) => boolean
): T[] {
  return data.filter(predicate);
}

/**
 * Search helper: ricerca in un array di oggetti
 */
export function searchData<T>(
  data: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) return data;

  const lowerQuery = query.toLowerCase();

  return data.filter(item =>
    fields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery);
      }
      return false;
    })
  );
}

export default {
  debounce,
  throttle,
  memoize,
  TTLCache,
  processBatch,
  RequestDeduplicator,
  LazyLoader,
  calculatePagination,
  getPaginationOffset,
  sortData,
  filterData,
  searchData,
};
