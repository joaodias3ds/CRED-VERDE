import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from '../config/motion';
import { hydrateQueryCache } from './queryClient';
import type { BootErrorKind, BootStage, BootStatus, UserSession } from './types';

export interface BootDependencies {
  checkOnline?: () => boolean;
  loadLocalSettings?: () => Promise<void>;
  pingDatabase?: (signal?: AbortSignal) => Promise<{ ok: boolean }>;
  fetchSession?: (signal?: AbortSignal) => Promise<{ session: UserSession | null; expired?: boolean }>;
  fetchBootstrapData?: (signal?: AbortSignal) => Promise<void>;
  checkHasCachedSession?: () => Promise<boolean>;
  minDurationMs?: number;
  slowThresholdMs?: number;
  timeoutErrorMs?: number;
  backoffMs?: readonly number[];
  skipMinDuration?: boolean;
}

export interface UseAppBootResult {
  etapa: BootStage;
  progresso: number;
  status: BootStatus;
  erro: BootErrorKind | null;
  sessao: UserSession | null;
  sessaoExpirada: boolean;
  usandoModoOffline: boolean;
  podeUsarOffline: boolean;
  tentativasAutomaticas: number;
  tentarNovamente: () => void;
  usarModoOffline: () => void;
  definirSessao: (sessao: UserSession | null) => void;
}

const SESSION_FLAG_KEY = 'creditoverde_had_session';

async function defaultLoadLocalSettings(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 450)),
    ]);
  }
}

async function defaultPingDatabase(signal?: AbortSignal): Promise<{ ok: boolean }> {
  const res = await fetch('/api/ping', { cache: 'no-store', signal });
  if (!res.ok) throw new Error('ping_failed');
  return res.json();
}

async function defaultFetchSession(
  signal?: AbortSignal,
): Promise<{ session: UserSession | null; expired?: boolean }> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('creditoverde_token') : null;
  const res = await fetch('/api/session', {
    cache: 'no-store',
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    return { session: null, expired: true };
  }
  if (!res.ok) throw new Error('session_failed');
  return res.json();
}

async function defaultFetchBootstrapData(signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/bootstrap', { cache: 'no-store', signal });
  if (!res.ok) throw new Error('bootstrap_failed');
  await res.json();
}

async function defaultCheckHasCachedSession(): Promise<boolean> {
  const { hasCachedData } = await hydrateQueryCache();
  const hadSession =
    typeof localStorage !== 'undefined' && localStorage.getItem(SESSION_FLAG_KEY) === 'true';
  return hasCachedData && hadSession;
}

export function useAppBoot(deps?: BootDependencies): UseAppBootResult {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const [etapa, setEtapa] = useState<BootStage>('iniciando');
  const [progresso, setProgresso] = useState<number>(8);
  const [status, setStatus] = useState<BootStatus>('iniciando');
  const [erro, setErro] = useState<BootErrorKind | null>(null);
  const [sessao, setSessao] = useState<UserSession | null>(null);
  const [sessaoExpirada, setSessaoExpirada] = useState<boolean>(false);
  const [usandoModoOffline, setUsandoModoOffline] = useState<boolean>(false);
  const [podeUsarOffline, setPodeUsarOffline] = useState<boolean>(false);
  const [tentativasAutomaticas, setTentativasAutomaticas] = useState<number>(0);

  const failedStageRef = useRef<BootStage>('iniciando');
  const runIdRef = useRef(0);
  const hasBootedRef = useRef(false);

  const runBootSequence = useCallback(async (startFromStage: BootStage = 'iniciando', autoAttempt = 0) => {
    const runId = ++runIdRef.current;
    const d = depsRef.current;
    const checkOnline = d?.checkOnline ?? (() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    const loadLocalSettings = d?.loadLocalSettings ?? defaultLoadLocalSettings;
    const pingDatabase = d?.pingDatabase ?? defaultPingDatabase;
    const fetchSession = d?.fetchSession ?? defaultFetchSession;
    const fetchBootstrapData = d?.fetchBootstrapData ?? defaultFetchBootstrapData;
    const checkHasCachedSession = d?.checkHasCachedSession ?? defaultCheckHasCachedSession;

    const minDurationMs = d?.skipMinDuration ? 0 : (d?.minDurationMs ?? motion.boot.tempoMinimoMs);
    const slowThresholdMs = d?.slowThresholdMs ?? motion.boot.avisoLentoMs;
    const timeoutErrorMs = d?.timeoutErrorMs ?? motion.boot.limiteErroMs;
    const backoffSchedule = d?.backoffMs ?? motion.boot.backoffMs;

    const startedAt = Date.now();
    const controller = new AbortController();

    setErro(null);
    setStatus('carregando');
    setTentativasAutomaticas(autoAttempt);

    const slowTimer = setTimeout(() => {
      if (runId === runIdRef.current) {
        setStatus((prev) => (prev === 'carregando' ? 'lento' : prev));
      }
    }, slowThresholdMs);

    const hardTimeoutTimer = setTimeout(() => {
      if (runId === runIdRef.current) {
        controller.abort();
      }
    }, timeoutErrorMs);

    const stageOrder: BootStage[] = ['iniciando', 'conexao', 'banco', 'sessao', 'dados'];
    const startIndex = Math.max(0, stageOrder.indexOf(startFromStage));

    const isStale = () => runId !== runIdRef.current;

    try {
      // Etapa 1: Iniciando (0-15%)
      if (startIndex <= 0) {
        failedStageRef.current = 'iniciando';
        setEtapa('iniciando');
        setProgresso(15);
        await loadLocalSettings();
        if (isStale()) return;
      }

      // Etapa 2: Verificando sua conexão (15-30%)
      if (startIndex <= 1) {
        failedStageRef.current = 'conexao';
        setEtapa('conexao');
        setProgresso(30);
        if (!checkOnline()) {
          const canOffline = await checkHasCachedSession();
          if (isStale()) return;
          setPodeUsarOffline(canOffline);
          setErro('sem_conexao');
          setStatus('erro');
          return;
        }
      }

      // Etapa 3: Conectando ao banco de dados (30-60%)
      if (startIndex <= 2) {
        failedStageRef.current = 'banco';
        setEtapa('banco');
        setProgresso(48);
        const pingResult = await pingDatabase(controller.signal);
        if (isStale()) return;
        if (!pingResult?.ok) {
          throw new Error('ping_not_ok');
        }
        setProgresso(60);
      }

      // Etapa 4: Verificando sua sessão (60-80%)
      if (startIndex <= 3) {
        failedStageRef.current = 'sessao';
        setEtapa('sessao');
        setProgresso(75);
        const sessionRes = await fetchSession(controller.signal);
        if (isStale()) return;

        if (sessionRes.expired) {
          setSessao(null);
          setSessaoExpirada(true);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('creditoverde_token');
          }
        } else {
          setSessao(sessionRes.session);
          setSessaoExpirada(false);
          if (sessionRes.session && typeof localStorage !== 'undefined') {
            localStorage.setItem(SESSION_FLAG_KEY, 'true');
          }
        }
        setProgresso(80);
      }

      // Etapa 5: Carregando seus dados (80-95%)
      if (startIndex <= 4) {
        failedStageRef.current = 'dados';
        setEtapa('dados');
        setProgresso(90);

        const cachedInfo = await hydrateQueryCache();
        if (isStale()) return;

        if (cachedInfo.hasCachedData) {
          // Usa o cache imediatamente e atualiza em segundo plano (Seção 3.2 & 7)
          void fetchBootstrapData().catch(() => undefined);
        } else {
          await fetchBootstrapData(controller.signal);
        }
        if (isStale()) return;
        setProgresso(95);
      }

      // Respeita o tempo mínimo de exibição (900ms) para a animação não piscar
      const elapsed = Date.now() - startedAt;
      if (elapsed < minDurationMs) {
        await new Promise<void>((resolve) => setTimeout(resolve, minDurationMs - elapsed));
      }
      if (isStale()) return;

      // Etapa 6: Tudo pronto! (100%)
      setEtapa('pronto');
      setProgresso(100);
      hasBootedRef.current = true;
      setStatus('pronto');
    } catch (err) {
      if (isStale()) return;

      const isOfflineNow = !checkOnline();
      const canOffline = await checkHasCachedSession();
      if (isStale()) return;
      setPodeUsarOffline(canOffline);

      if (isOfflineNow) {
        setErro('sem_conexao');
        setStatus('erro');
        return;
      }

      const isAborted = err instanceof DOMException && err.name === 'AbortError';
      if (isAborted) {
        setErro('timeout');
        setStatus('erro');
        return;
      }

      if (autoAttempt < motion.boot.tentativasAutomaticas) {
        const delay = backoffSchedule[autoAttempt] ?? 2000;
        setTentativasAutomaticas(autoAttempt + 1);
        setTimeout(() => {
          if (runId === runIdRef.current) {
            void runBootSequence(failedStageRef.current, autoAttempt + 1);
          }
        }, delay);
        return;
      }

      setErro('servidor_indisponivel');
      setStatus('erro');
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(hardTimeoutTimer);
    }
  }, []);

  useEffect(() => {
    if (!hasBootedRef.current) {
      void runBootSequence('iniciando', 0);
    }
    return () => {
      runIdRef.current += 1;
    };
  }, [runBootSequence]);

  const tentarNovamente = useCallback(() => {
    void runBootSequence(failedStageRef.current, 0);
  }, [runBootSequence]);

  const usarModoOffline = useCallback(() => {
    void hydrateQueryCache().then(() => {
      setUsandoModoOffline(true);
      setEtapa('pronto');
      setProgresso(100);
      hasBootedRef.current = true;
      setStatus('pronto');
    });
  }, []);

  const definirSessao = useCallback((novaSessao: UserSession | null) => {
    setSessao(novaSessao);
    if (novaSessao) {
      setSessaoExpirada(false);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SESSION_FLAG_KEY, 'true');
      }
    }
  }, []);

  return {
    etapa,
    progresso,
    status,
    erro,
    sessao,
    sessaoExpirada,
    usandoModoOffline,
    podeUsarOffline,
    tentativasAutomaticas,
    tentarNovamente,
    usarModoOffline,
    definirSessao,
  };
}
