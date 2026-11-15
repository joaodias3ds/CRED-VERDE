import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarClock,
  CloudOff,
  FileSpreadsheet,
  Home,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { ConnectionBanner, strings } from '@emprestimo/ui';
import type { ConexaoEstado, UserRole, UserSession } from '@emprestimo/api-client';

export type AppRoute =
  | 'inicio'
  | 'clientes'
  | 'cliente_detalhe'
  | 'emprestimos'
  | 'parcelas'
  | 'cobranca'
  | 'relatorios'
  | 'configuracoes';

export interface AppShellProps {
  rotaAtual: AppRoute;
  tituloPagina: string;
  onNavegar: (rota: AppRoute) => void;
  sessao: UserSession;
  onSair: () => void;
  conexaoEstado: ConexaoEstado;
  pendingSyncCount: number;
  onRecheckConnection: () => void;
  isOffline: boolean;
  isRevalidating?: boolean;
  notificacoesNaoLidas?: number;
  notificacoesProntas?: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  acaoPrimaria?: React.ReactNode;
  children: React.ReactNode;
}

const roleLabels: Record<UserRole, string> = {
  emprestador: 'Emprestador',
  equipe: 'Equipe de Cobrança',
  cliente: 'Portal do Cliente',
  super_admin: 'Super Admin',
};

function getNavItemsForRole(role: UserRole): Array<{
  id: Exclude<AppRoute, 'cliente_detalhe'>;
  label: string;
  Icon: typeof Home;
}> {
  if (role === 'cliente') {
    return [
      { id: 'inicio', label: 'Meu Resumo', Icon: Home },
      { id: 'emprestimos', label: 'Meus Contratos', Icon: FileSpreadsheet },
      { id: 'parcelas', label: 'Minhas Parcelas', Icon: CalendarClock },
      { id: 'configuracoes', label: 'Configurações', Icon: Settings },
    ];
  }

  if (role === 'equipe') {
    return [
      { id: 'inicio', label: 'Operação do Dia', Icon: Home },
      { id: 'cobranca', label: 'Cobrança', Icon: MapPin },
      { id: 'parcelas', label: 'Parcelas', Icon: CalendarClock },
      { id: 'clientes', label: 'Clientes', Icon: Users },
      { id: 'configuracoes', label: 'Configurações', Icon: Settings },
    ];
  }

  if (role === 'super_admin') {
    return [
      { id: 'inicio', label: 'Visão Global', Icon: Home },
      { id: 'relatorios', label: 'Relatórios', Icon: BarChart3 },
      { id: 'clientes', label: 'Clientes', Icon: Users },
      { id: 'emprestimos', label: 'Empréstimos', Icon: FileSpreadsheet },
      { id: 'configuracoes', label: 'Configurações', Icon: Settings },
    ];
  }

  return [
    { id: 'inicio', label: 'Início', Icon: Home },
    { id: 'clientes', label: 'Clientes', Icon: Users },
    { id: 'emprestimos', label: 'Empréstimos', Icon: FileSpreadsheet },
    { id: 'parcelas', label: 'Parcelas', Icon: CalendarClock },
    { id: 'cobranca', label: 'Cobrança', Icon: MapPin },
    { id: 'relatorios', label: 'Relatórios', Icon: BarChart3 },
    { id: 'configuracoes', label: 'Configurações', Icon: Settings },
  ];
}

export function AppShell({
  rotaAtual,
  tituloPagina,
  onNavegar,
  sessao,
  onSair,
  conexaoEstado,
  pendingSyncCount,
  onRecheckConnection,
  isOffline,
  isRevalidating = false,
  notificacoesNaoLidas,
  notificacoesProntas = false,
  darkMode,
  onToggleDarkMode,
  acaoPrimaria,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = getNavItemsForRole(sessao.role);

  const handleSelectNav = (id: Exclude<AppRoute, 'cliente_detalhe'>) => {
    onNavegar(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] text-[#111C16] dark:bg-[#070E0B] dark:text-[#ECF3EE]">
      {/* Sidebar desktop (256px) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#DCE3DF] bg-white dark:border-[#192D23] dark:bg-[#0B1510] lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-[#DCE3DF] px-5 dark:border-[#192D23]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B7A45] to-[#22C55E] font-display text-sm font-bold text-white shadow-sm">
            R$
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-[#111C16] dark:text-[#ECF3EE] whitespace-nowrap">
            {strings.app.nome}
          </span>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 space-y-1 p-3">
          {navItems.map(({ id, label, Icon }) => {
            const ativo =
              rotaAtual === id || (id === 'clientes' && rotaAtual === 'cliente_detalhe');
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectNav(id)}
                aria-current={ativo ? 'page' : undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  ativo
                    ? 'bg-[#0E1E16] text-white shadow-sm dark:bg-[#142D20] dark:text-[#6EE7B7]'
                    : 'text-[#4B5D53] hover:bg-[#F3F7F5] hover:text-[#111C16] dark:text-[#96ACA0] dark:hover:bg-[#112219] dark:hover:text-[#ECF3EE]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </span>
                {id === 'parcelas' &&
                  notificacoesProntas &&
                  typeof notificacoesNaoLidas === 'number' &&
                  notificacoesNaoLidas > 0 && (
                    <span className="font-mono text-xs font-semibold tabular-nums opacity-85">
                      {notificacoesNaoLidas}
                    </span>
                  )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#DCE3DF] p-4 dark:border-[#192D23]">
          <div className="rounded-xl bg-[#F4F7F5] p-3 dark:bg-[#112019]">
            <p className="text-xs font-semibold text-[#111C16] dark:text-[#ECF3EE] truncate">
              {sessao.nome}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[#0B7A45] dark:text-[#34D399] truncate">
              {roleLabels[sessao.role]}
            </p>
            <p className="mt-0.5 text-[11px] text-[#64786D] dark:text-[#869D90] truncate">
              {sessao.tenantNome} · {sessao.plano}
            </p>
          </div>
          <button
            type="button"
            onClick={onSair}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE3DF] px-3 py-2 text-xs font-medium text-[#4B5D53] transition-colors hover:bg-[#F3F7F5] dark:border-[#1E3329] dark:text-[#96ACA0] dark:hover:bg-[#12241B]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Trocar perfil / Sair</span>
          </button>
        </div>
      </aside>

      {/* Drawer mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-[#0B1510]">
            <div className="flex h-14 items-center justify-between border-b border-[#DCE3DF] px-4 dark:border-[#192D23]">
              <span className="font-display text-base font-bold text-[#111C16] dark:text-[#ECF3EE]">
                {strings.app.nome}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-[#54665C] dark:text-[#96ACA0]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Navegação mobile" className="flex-1 space-y-1 p-3">
              {navItems.map(({ id, label, Icon }) => {
                const ativo =
                  rotaAtual === id || (id === 'clientes' && rotaAtual === 'cliente_detalhe');
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectNav(id)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      ativo
                        ? 'bg-[#0E1E16] text-white dark:bg-[#142D20] dark:text-[#6EE7B7]'
                        : 'text-[#4B5D53] dark:text-[#96ACA0]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-[#DCE3DF] p-4 dark:border-[#192D23]">
              <p className="mb-2 text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                {sessao.nome} · {roleLabels[sessao.role]}
              </p>
              <button
                type="button"
                onClick={onSair}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#DCE3DF] px-3 py-2 text-sm font-medium text-[#4B5D53] dark:border-[#1E3329] dark:text-[#96ACA0]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Trocar perfil / Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[#DCE3DF] bg-white/95 backdrop-blur-sm dark:border-[#192D23] dark:bg-[#0B1510]/95">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCE3DF] text-[#111C16] lg:hidden dark:border-[#1E3329] dark:text-[#ECF3EE]"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="hidden text-[#64786D] sm:inline dark:text-[#869D90]">
                  {roleLabels[sessao.role]}
                </span>
                <span className="hidden text-[#CBD7D0] sm:inline dark:text-[#243D31]" aria-hidden="true">
                  /
                </span>
                <h1 className="truncate font-display text-base font-semibold text-[#111C16] sm:text-lg dark:text-[#ECF3EE]">
                  {tituloPagina}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {isRevalidating && (
                <span className="hidden text-xs font-medium text-[#54665C] sm:inline dark:text-[#96ACA0]">
                  {strings.offline.atualizando}
                </span>
              )}

              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={darkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3DF] text-[#4B5D53] transition-colors hover:bg-[#F3F7F5] dark:border-[#1E3329] dark:text-[#96ACA0] dark:hover:bg-[#12241B]"
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {sessao.role !== 'super_admin' && (
                <button
                  type="button"
                  onClick={() => onNavegar('parcelas')}
                  aria-label="Notificações de parcelas"
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3DF] text-[#4B5D53] transition-colors hover:bg-[#F3F7F5] dark:border-[#1E3329] dark:text-[#96ACA0] dark:hover:bg-[#12241B]"
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {notificacoesProntas &&
                    typeof notificacoesNaoLidas === 'number' &&
                    notificacoesNaoLidas > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0F9D58] px-1 font-mono text-[10px] font-bold text-white">
                        {notificacoesNaoLidas}
                      </span>
                    )}
                </button>
              )}

              {acaoPrimaria}
            </div>
          </div>

          <ConnectionBanner
            estado={conexaoEstado}
            pendingSyncCount={pendingSyncCount}
            onRecheck={onRecheckConnection}
          />
        </header>

        <main className="mx-auto w-full max-w-[1320px] flex-1 p-4 sm:p-6">
          {isOffline && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{strings.offline.aviso}</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
