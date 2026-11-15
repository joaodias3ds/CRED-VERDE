import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import { sanitizeCachePayload } from './finance';

export const STALE_TIMES = {
  dashboard: 30 * 1000,      // 30s
  parcelas: 30 * 1000,       // 30s
  clientes: 60 * 1000,       // 60s
  emprestimos: 60 * 1000,    // 60s
  cobranca: 30 * 1000,       // 30s
  relatorios: 60 * 1000,     // 60s
  configuracoes: 5 * 60 * 1000, // 5 min
} as const;

const CACHE_STORAGE_KEY = 'creditoverde_query_cache_v1';

interface CachedEntry {
  queryKey: readonly unknown[];
  data: unknown;
  dataUpdatedAt: number;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.clientes,
      gcTime: 24 * 60 * 60 * 1000, // 24h
      retry: (failureCount, error) => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return false;
        }
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

let persistTimer: number | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function persistQueryCache(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const cache = queryClient.getQueryCache().getAll();
    const entries: CachedEntry[] = [];

    for (const query of cache) {
      if (query.state.status === 'success' && query.state.data !== undefined) {
        entries.push({
          queryKey: query.queryKey,
          data: sanitizeCachePayload(query.queryKey, query.state.data),
          dataUpdatedAt: query.state.dataUpdatedAt,
        });
      }
    }

    await set(CACHE_STORAGE_KEY, {
      savedAt: Date.now(),
      entries,
    });
  } catch {
    // Falha silenciosa em IndexedDB restrito
  }
}

export async function hydrateQueryCache(): Promise<{
  hasCachedData: boolean;
  savedAt: number | null;
}> {
  if (!isIndexedDbAvailable()) {
    return { hasCachedData: false, savedAt: null };
  }
  try {
    const stored = await get<{ savedAt: number; entries: CachedEntry[] }>(CACHE_STORAGE_KEY);
    if (!stored || !Array.isArray(stored.entries) || stored.entries.length === 0) {
      return { hasCachedData: false, savedAt: null };
    }
    for (const entry of stored.entries) {
      queryClient.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
    }
    return { hasCachedData: true, savedAt: stored.savedAt };
  } catch {
    return { hasCachedData: false, savedAt: null };
  }
}

export async function clearPersistedCache(): Promise<void> {
  queryClient.clear();
  if (!isIndexedDbAvailable()) return;
  try {
    await del(CACHE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function attachCachePersistence(): () => void {
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'success') {
      if (typeof window !== 'undefined') {
        if (persistTimer !== null) window.clearTimeout(persistTimer);
        persistTimer = window.setTimeout(() => {
          void persistQueryCache();
        }, 400);
      }
    }
  });
  return unsubscribe;
}
