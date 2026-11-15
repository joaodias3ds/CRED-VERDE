import { useEffect, useState } from 'react';
import { QueryClientProvider, useIsFetching, useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { BootGate, ToastProvider, strings, useToast } from '@emprestimo/ui';
import {
  STALE_TIMES,
  attachCachePersistence,
  queryClient,
  useConexao,
  type Customer,
  type UseAppBootResult,
  type UserRole,
  type UserSession,
} from '@emprestimo/api-client';
import { AppShell, type AppRoute } from './components/AppShell';
import { NewCustomerModal, NewLoanModal, type LoanDraftPreset } from './components/Modals';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientesPage } from './pages/ClientesPage';
import { ClienteDetalhePage } from './pages/ClienteDetalhePage';
import { EmprestimosPage } from './pages/EmprestimosPage';
import { ParcelasPage } from './pages/ParcelasPage';
import { CobrancaPage } from './pages/CobrancaPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';

function getPageTitle(rota: AppRoute, role: UserRole): string {
  if (rota === 'inicio') {
    if (role === 'cliente') return 'Meu Resumo';
    if (role === 'equipe') return 'Operação do Dia';
    if (role === 'super_admin') return 'Visão Global';
    return 'Início';
  }
  if (rota === 'emprestimos' && role === 'cliente') return 'Meus Contratos';
  if (rota === 'parcelas' && role === 'cliente') return 'Minhas Parcelas';

  const map: Record<AppRoute, string> = {
    inicio: 'Início',
    clientes: 'Clientes',
    cliente_detalhe: 'Ficha do cliente',
    emprestimos: 'Empréstimos',
    parcelas: 'Parcelas',
    cobranca: 'Cobrança',
    relatorios: 'Relatórios',
    configuracoes: 'Configurações',
  };
  return map[rota];
}

function buildRoleSession(role: UserRole): UserSession {
  const presets: Record<UserRole, Omit<UserSession, 'expiraEm'>> = {
    emprestador: {
      id: 'usr_1',
      nome: 'Ricardo Mendes',
      email: 'ricardo@creditoverde.com.br',
      role: 'emprestador',
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      permissoes: ['clientes:ler', 'clientes:criar', 'emprestimos:aprovar', 'parcelas:receber', 'relatorios:ver'],
      notificacoesNaoLidas: 3,
    },
    equipe: {
      id: 'usr_2',
      nome: 'Camila Rocha',
      email: 'camila@creditoverde.com.br',
      role: 'equipe',
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      permissoes: ['clientes:ler', 'parcelas:receber', 'cobranca:visitar'],
      notificacoesNaoLidas: 3,
    },
    cliente: {
      id: 'cli_1',
      nome: 'Mariana Oliveira Costa',
      email: 'mariana.costa@email.com.br',
      role: 'cliente',
      tenantNome: 'Mendes Crédito Regional',
      plano: 'Profissional',
      permissoes: ['meus_emprestimos:ler', 'minhas_parcelas:pagar'],
      notificacoesNaoLidas: 1,
    },
    super_admin: {
      id: 'usr_admin',
      nome: 'Diretoria CréditoVerde',
      email: 'diretoria@creditoverde.com.br',
      role: 'super_admin',
      tenantNome: 'Plataforma CréditoVerde',
      plano: 'Corporativo',
      permissoes: ['tenants:gerenciar', 'relatorios:global'],
      notificacoesNaoLidas: 2,
    },
  };

  return {
    ...presets[role],
    expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function AuthenticatedApp({
  boot,
  autostart,
  autostartRole,
}: {
  boot: UseAppBootResult;
  autostart: boolean;
  autostartRole: UserRole;
}) {
  const { mostrarToast } = useToast();
  const [rota, setRota] = useState<AppRoute>('inicio');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>('cli_1');
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalEmprestimoOpen, setModalEmprestimoOpen] = useState(false);
  const [loanDraftPreset, setLoanDraftPreset] = useState<LoanDraftPreset | undefined>(undefined);

  const [darkMode, setDarkMode] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion'),
  );

  const isFetchingAny = useIsFetching() > 0;

  const conexao = useConexao({
    onSyncSuccess: (count) => {
      mostrarToast({
        variante: 'sucesso',
        mensagem: `${count} ${count === 1 ? 'registro sincronizado' : 'registros sincronizados'} com o servidor.`,
      });
    },
  });

  useEffect(() => {
    if (autostart && !boot.sessao && !boot.usandoModoOffline) {
      localStorage.setItem('creditoverde_token', `demo-${autostartRole}`);
      boot.definirSessao(buildRoleSession(autostartRole));
    }
  }, [autostart, autostartRole, boot]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('creditoverde_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('reduce-motion', next);
      localStorage.setItem('creditoverde_reduced_motion', next ? 'true' : 'false');
      return next;
    });
  };

  const bootstrapQuery = useQuery<{ notificacoesNaoLidas: number }>({
    queryKey: ['bootstrap'],
    staleTime: STALE_TIMES.dashboard,
    enabled: Boolean(boot.sessao) || boot.usandoModoOffline,
    queryFn: async () => {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('bootstrap_error');
      return res.json();
    },
  });

  const clientesModalQuery = useQuery<Customer[]>({
    queryKey: ['clientes', 'todos', ''],
    staleTime: STALE_TIMES.clientes,
    enabled: (Boolean(boot.sessao) || boot.usandoModoOffline) && boot.sessao?.role !== 'cliente',
    queryFn: async () => {
      const res = await fetch('/api/clientes');
      if (!res.ok) throw new Error('clientes_error');
      return res.json();
    },
  });

  const handleLoginSuccess = (token: string, session: UserSession) => {
    localStorage.setItem('creditoverde_token', token);
    boot.definirSessao(session);
    setRota('inicio');
  };

  const handleSwitchRole = (role: UserRole) => {
    localStorage.setItem('creditoverde_token', `demo-${role}`);
    boot.definirSessao(buildRoleSession(role));
    setRota('inicio');
    mostrarToast({
      variante: 'sucesso',
      mensagem: `Visualização alterada para ${buildRoleSession(role).nome}.`,
    });
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('creditoverde_token');
    localStorage.removeItem('creditoverde_token');
    boot.definirSessao(null);
    setRota('inicio');
    if (token) {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
  };

  if (!boot.sessao && !boot.usandoModoOffline) {
    return (
      <LoginPage
        sessaoExpirada={boot.sessaoExpirada}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const sessaoAtiva: UserSession = boot.sessao ?? {
    ...buildRoleSession('emprestador'),
    nome: 'Ricardo Mendes (Offline)',
  };

  const isOfflineNow = boot.usandoModoOffline || conexao.isOffline;
  const activeRole = sessaoAtiva.role;
  const filterClienteId = activeRole === 'cliente' ? sessaoAtiva.id : undefined;

  const abrirCliente = (id: string) => {
    setClienteSelecionadoId(id);
    setRota('cliente_detalhe');
  };

  const abrirNovoEmprestimo = (preset?: LoanDraftPreset) => {
    setLoanDraftPreset(preset);
    setModalEmprestimoOpen(true);
  };

  const acaoPrimaria =
    activeRole === 'emprestador' || activeRole === 'super_admin' ? (
      <button
        type="button"
        disabled={isOfflineNow}
        onClick={() => abrirNovoEmprestimo()}
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B7A45] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#096438] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{strings.acao.novoEmprestimo}</span>
        <span className="sm:hidden">Novo</span>
      </button>
    ) : undefined;

  return (
    <>
      <AppShell
        rotaAtual={rota}
        tituloPagina={getPageTitle(rota, activeRole)}
        onNavegar={setRota}
        sessao={sessaoAtiva}
        onSair={() => void handleLogout()}
        conexaoEstado={conexao.estado}
        pendingSyncCount={conexao.pendingSyncCount}
        onRecheckConnection={() => void conexao.recheckConnection()}
        isOffline={isOfflineNow}
        isRevalidating={isFetchingAny}
        notificacoesNaoLidas={
          activeRole === 'cliente'
            ? sessaoAtiva.notificacoesNaoLidas
            : bootstrapQuery.data?.notificacoesNaoLidas
        }
        notificacoesProntas={
          activeRole === 'cliente' ? true : bootstrapQuery.isSuccess
        }
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        acaoPrimaria={acaoPrimaria}
      >
        {rota === 'inicio' && (
          <DashboardPage
            role={activeRole}
            userId={sessaoAtiva.id}
            isOffline={isOfflineNow}
            onNavegar={setRota}
            onAbrirNovoEmprestimo={() => abrirNovoEmprestimo()}
            onAbrirNovoCliente={() => setModalClienteOpen(true)}
          />
        )}
        {rota === 'clientes' && (
          <ClientesPage
            isOffline={isOfflineNow}
            onSelecionarCliente={abrirCliente}
            onAbrirNovoCliente={() => setModalClienteOpen(true)}
          />
        )}
        {rota === 'cliente_detalhe' && (
          <ClienteDetalhePage
            clienteId={clienteSelecionadoId}
            onVoltar={() => setRota('clientes')}
          />
        )}
        {rota === 'emprestimos' && (
          <EmprestimosPage
            isOffline={isOfflineNow}
            filterClienteId={filterClienteId}
            canManageLoans={activeRole === 'emprestador' || activeRole === 'super_admin'}
            userRole={activeRole}
            onAbrirNovoEmprestimo={abrirNovoEmprestimo}
            onSelecionarCliente={abrirCliente}
          />
        )}
        {rota === 'parcelas' && (
          <ParcelasPage isOffline={isOfflineNow} filterClienteId={filterClienteId} />
        )}
        {rota === 'cobranca' && (
          <CobrancaPage
            isOffline={isOfflineNow}
            onQueueOfflineAction={conexao.queueOfflineAction}
          />
        )}
        {rota === 'relatorios' && <RelatoriosPage />}
        {rota === 'configuracoes' && (
          <ConfiguracoesPage
            activeRole={activeRole}
            userId={sessaoAtiva.id}
            isOffline={isOfflineNow}
            onSwitchRole={handleSwitchRole}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            reducedMotion={reducedMotion}
            onToggleReducedMotion={toggleReducedMotion}
            onRecheckConnection={() => void conexao.recheckConnection()}
          />
        )}
      </AppShell>

      <NewCustomerModal
        open={modalClienteOpen}
        onClose={() => setModalClienteOpen(false)}
      />
      <NewLoanModal
        open={modalEmprestimoOpen}
        clientes={clientesModalQuery.data ?? []}
        preset={loanDraftPreset}
        decididoPor={sessaoAtiva.nome}
        userRole={activeRole}
        onClose={() => {
          setModalEmprestimoOpen(false);
          setLoanDraftPreset(undefined);
        }}
      />
    </>
  );
}

export default function App() {
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const autostart = params?.get('autostart') === '1';
  const rawRole = params?.get('role') as UserRole | null;
  const autostartRole: UserRole =
    rawRole === 'cliente' || rawRole === 'equipe' || rawRole === 'super_admin'
      ? rawRole
      : 'emprestador';

  useEffect(() => {
    return attachCachePersistence();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BootGate skipBoot={autostart}>
          {(boot) => (
            <AuthenticatedApp
              boot={boot}
              autostart={autostart}
              autostartRole={autostartRole}
            />
          )}
        </BootGate>
      </ToastProvider>
    </QueryClientProvider>
  );
}
