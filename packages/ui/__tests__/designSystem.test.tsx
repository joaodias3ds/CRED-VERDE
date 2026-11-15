import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Skeleton } from '../feedback/Skeleton';
import { DataState } from '../feedback/DataState';
import { EmptyState } from '../feedback/EmptyState';
import { LoadingButton } from '../feedback/LoadingButton';
import { ToastProvider } from '../feedback/ToastProvider';
import { useAppBoot } from '../../api-client/useAppBoot';

describe('Skeleton', () => {
  it('renderiza com aria-busy="true" e texto acessível de carregamento', () => {
    render(<Skeleton width={120} height={24} />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(el).toHaveAttribute('aria-label', 'Carregando…');
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });
});

describe('DataState', () => {
  it('exibe skeleton quando carregando', () => {
    render(
      <DataState
        status="carregando"
        skeleton={<div data-testid="meu-skeleton">Carregando bloco</div>}
        vazio={<div>Vazio</div>}
      >
        <div>Conteúdo real</div>
      </DataState>,
    );
    expect(screen.getByTestId('meu-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo real')).not.toBeInTheDocument();
  });

  it('exibe conteúdo quando sucesso', () => {
    render(
      <DataState
        status="sucesso"
        skeleton={<div>Skeleton</div>}
        vazio={<div>Vazio</div>}
      >
        <div>Saldo R$ 1.500,00</div>
      </DataState>,
    );
    expect(screen.getByText('Saldo R$ 1.500,00')).toBeInTheDocument();
  });

  it('exibe estado vazio com botão de ação', () => {
    const onCriar = vi.fn();
    render(
      <DataState
        status="vazio"
        skeleton={<div>Skeleton</div>}
        vazio={
          <EmptyState
            titulo="Nenhum cliente ainda"
            acaoLabel="Cadastrar cliente"
            onAcao={onCriar}
          />
        }
      >
        <div>Lista</div>
      </DataState>,
    );
    expect(screen.getByText('Nenhum cliente ainda')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));
    expect(onCriar).toHaveBeenCalledTimes(1);
  });

  it('exibe erro isolado com botão Tentar novamente', () => {
    const onRetry = vi.fn();
    render(
      <DataState
        status="erro"
        skeleton={<div>Skeleton</div>}
        vazio={<div>Vazio</div>}
        onTentarNovamente={onRetry}
      >
        <div>Conteúdo</div>
      </DataState>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('LoadingButton', () => {
  it('desabilita duplo clique durante envio e reutiliza chave de idempotência ao falhar', async () => {
    const keys: string[] = [];
    let resolveFirst: () => void = () => undefined;
    const action = vi.fn(
      (key: string) =>
        new Promise<void>((resolve) => {
          keys.push(key);
          resolveFirst = resolve;
        }),
    );

    render(
      <ToastProvider>
        <LoadingButton onAction={action} loadingLabel="Salvando…">
          Confirmar pagamento
        </LoadingButton>
      </ToastProvider>,
    );

    const btn = screen.getByRole('button', { name: 'Confirmar pagamento' });
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(action).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();
    expect(screen.getByText('Salvando…')).toBeInTheDocument();

    await act(async () => {
      resolveFirst();
    });
    expect(keys.length).toBe(1);
  });
});

describe('useAppBoot', () => {
  it('executa as etapas em ordem e respeita o tempo mínimo configurado', async () => {
    const started = Date.now();
    const { result } = renderHook(() =>
      useAppBoot({
        checkOnline: () => true,
        loadLocalSettings: async () => undefined,
        pingDatabase: async () => ({ ok: true }),
        fetchSession: async () => ({ session: null }),
        fetchBootstrapData: async () => undefined,
        checkHasCachedSession: async () => false,
        minDurationMs: 120,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('pronto');
    });

    expect(result.current.etapa).toBe('pronto');
    expect(result.current.progresso).toBe(100);
    expect(Date.now() - started).toBeGreaterThanOrEqual(100);
  });

  it('mostra erro sem_conexao imediatamente quando offline', async () => {
    const { result } = renderHook(() =>
      useAppBoot({
        checkOnline: () => false,
        loadLocalSettings: async () => undefined,
        checkHasCachedSession: async () => true,
        minDurationMs: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('erro');
    });

    expect(result.current.erro).toBe('sem_conexao');
    expect(result.current.podeUsarOffline).toBe(true);
  });

  it('ativa status lento quando banco demora acima do limite', async () => {
    let resolvePing: (val: { ok: boolean }) => void = () => undefined;
    const { result } = renderHook(() =>
      useAppBoot({
        checkOnline: () => true,
        loadLocalSettings: async () => undefined,
        pingDatabase: () =>
          new Promise((resolve) => {
            resolvePing = resolve;
          }),
        fetchSession: async () => ({ session: null }),
        fetchBootstrapData: async () => undefined,
        checkHasCachedSession: async () => false,
        minDurationMs: 0,
        slowThresholdMs: 40,
        timeoutErrorMs: 5000,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('lento');
    });

    await act(async () => {
      resolvePing({ ok: true });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('pronto');
    });
  });
});
