import { useCallback, useEffect, useRef, useState } from 'react';
import { get, set } from 'idb-keyval';
import { queryClient } from './queryClient';
import { generateIdempotencyKey } from './finance';
import type { OfflineQueuedAction } from './types';

export type ConexaoEstado =
  | 'online'
  | 'offline'
  | 'lento'
  | 'restabelecida'
  | 'servidor_indisponivel';

const OFFLINE_QUEUE_KEY = 'creditoverde_offline_queue_v1';

async function readOfflineQueue(): Promise<OfflineQueuedAction[]> {
  try {
    if (typeof indexedDB === 'undefined') return [];
    const items = await get<OfflineQueuedAction[]>(OFFLINE_QUEUE_KEY);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function writeOfflineQueue(items: OfflineQueuedAction[]): Promise<void> {
  try {
    if (typeof indexedDB === 'undefined') return;
    await set(OFFLINE_QUEUE_KEY, items);
  } catch {
    // ignore
  }
}

export function useConexao(options?: {
  simulatedOffline?: boolean;
  onSyncSuccess?: (syncedCount: number) => void;
}) {
  const simulatedOffline = options?.simulatedOffline ?? false;
  const [estado, setEstado] = useState<ConexaoEstado>(() => {
    if (simulatedOffline) return 'offline';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    return 'online';
  });
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const wasOfflineRef = useRef(false);
  const restoreTimerRef = useRef<number | null>(null);
  const onSyncSuccessRef = useRef(options?.onSyncSuccess);
  onSyncSuccessRef.current = options?.onSyncSuccess;

  const refreshQueueCount = useCallback(async () => {
    const queue = await readOfflineQueue();
    setPendingSyncCount(queue.length);
  }, []);

  const syncPendingActions = useCallback(async (): Promise<number> => {
    if (simulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return 0;
    }
    const queue = await readOfflineQueue();
    if (queue.length === 0) return 0;

    const remaining: OfflineQueuedAction[] = [];
    let synced = 0;

    for (const action of queue) {
      try {
        const res = await fetch(action.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': action.idempotencyKey,
          },
          body: JSON.stringify(action.payload),
        });
        if (res.ok) {
          synced += 1;
        } else {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
    }

    await writeOfflineQueue(remaining);
    setPendingSyncCount(remaining.length);

    if (synced > 0) {
      await queryClient.invalidateQueries();
      onSyncSuccessRef.current?.(synced);
    }

    return synced;
  }, [simulatedOffline]);

  const queueOfflineAction = useCallback(
    async (action: Omit<OfflineQueuedAction, 'id' | 'criadoEm' | 'idempotencyKey'> & { idempotencyKey?: string }) => {
      const queue = await readOfflineQueue();
      const entry: OfflineQueuedAction = {
        ...action,
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        idempotencyKey: action.idempotencyKey ?? generateIdempotencyKey('offline'),
        criadoEm: new Date().toISOString(),
      };
      const next = [...queue, entry];
      await writeOfflineQueue(next);
      setPendingSyncCount(next.length);
      return entry;
    },
    [],
  );

  const checkServerHealth = useCallback(async () => {
    if (simulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      wasOfflineRef.current = true;
      setEstado('offline');
      return;
    }

    const startedAt = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/api/ping', {
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const elapsed = performance.now() - startedAt;

      if (!res.ok) {
        setEstado('servidor_indisponivel');
        return;
      }

      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setEstado('restabelecida');
        void syncPendingActions();
        void queryClient.refetchQueries({ type: 'active' });
        if (restoreTimerRef.current !== null) {
          window.clearTimeout(restoreTimerRef.current);
        }
        restoreTimerRef.current = window.setTimeout(() => {
          setEstado('online');
        }, 2000);
        return;
      }

      if (elapsed > 2500) {
        setEstado('lento');
      } else {
        setEstado((prev) => (prev === 'restabelecida' ? 'restabelecida' : 'online'));
      }
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        wasOfflineRef.current = true;
        setEstado('offline');
      } else {
        setEstado('servidor_indisponivel');
      }
    }
  }, [simulatedOffline, syncPendingActions]);

  useEffect(() => {
    void refreshQueueCount();
  }, [refreshQueueCount]);

  useEffect(() => {
    if (simulatedOffline) {
      wasOfflineRef.current = true;
      setEstado('offline');
      return;
    }

    if (wasOfflineRef.current && (typeof navigator === 'undefined' || navigator.onLine)) {
      void checkServerHealth();
    }
  }, [simulatedOffline, checkServerHealth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setEstado('offline');
    };

    const handleOnline = () => {
      if (!simulatedOffline) {
        void checkServerHealth();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const intervalId = window.setInterval(() => {
      void checkServerHealth();
    }, 30000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.clearInterval(intervalId);
      if (restoreTimerRef.current !== null) {
        window.clearTimeout(restoreTimerRef.current);
      }
    };
  }, [simulatedOffline, checkServerHealth]);

  return {
    estado,
    isOnline: estado === 'online' || estado === 'restabelecida' || estado === 'lento',
    isOffline: estado === 'offline',
    pendingSyncCount,
    queueOfflineAction,
    syncPendingActions,
    recheckConnection: checkServerHealth,
  };
}
