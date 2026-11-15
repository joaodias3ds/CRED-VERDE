import { useQuery } from '@tanstack/react-query';
import { Moon, RefreshCw, ShieldCheck, Sun, Trash2, UserCheck } from 'lucide-react';
import { useToast } from '@emprestimo/ui';
import {
  STALE_TIMES,
  clearPersistedCache,
  type Customer,
  type UserRole,
} from '@emprestimo/api-client';
import { LocationConsentCard } from '../components/LocationConsentCard';

export interface ConfiguracoesPageProps {
  activeRole: UserRole;
  userId?: string;
  isOffline?: boolean;
  onSwitchRole: (role: UserRole) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onRecheckConnection: () => void;
}

const perfis: Array<{ id: UserRole; titulo: string; resumo: string }> = [
  { id: 'emprestador', titulo: 'Emprestador', resumo: 'Carteira completa, gráficos e aprovação' },
  { id: 'equipe', titulo: 'Equipe', resumo: 'Metas de cobrança e baixa rápida' },
  { id: 'cliente', titulo: 'Cliente', resumo: 'Portal do tomador, score e PIX' },
  { id: 'super_admin', titulo: 'Super Admin', resumo: 'Visão multi-tenant e MRR' },
];

export function ConfiguracoesPage({
  activeRole,
  userId = 'cli_1',
  isOffline = false,
  onSwitchRole,
  darkMode,
  onToggleDarkMode,
  reducedMotion,
  onToggleReducedMotion,
  onRecheckConnection,
}: ConfiguracoesPageProps) {
  const { mostrarToast } = useToast();

  const clienteSelfQuery = useQuery<Customer>({
    queryKey: ['cliente', userId],
    staleTime: STALE_TIMES.clientes,
    enabled: activeRole === 'cliente',
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${userId}`);
      if (!res.ok) throw new Error('cliente_self_error');
      return res.json();
    },
  });

  const handleClearCache = async () => {
    await clearPersistedCache();
    mostrarToast({
      variante: 'sucesso',
      mensagem: 'Cache local limpo com sucesso.',
    });
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Alternar visão por perfil de acesso */}
      <div className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-[#0F9D58]" aria-hidden="true" />
          <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
            Perfil de acesso ativo
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
          Cada perfil exibe menus, métricas e fluxos próprios para sua função.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {perfis.map((p) => {
            const ativo = activeRole === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSwitchRole(p.id)}
                className={`flex flex-col rounded-xl border p-3.5 text-left transition-colors ${
                  ativo
                    ? 'border-[#0F9D58] bg-[#EAF5EF] dark:bg-[#142D20]'
                    : 'border-[#DCE3DF] bg-white hover:bg-[#F7FAF8] dark:border-[#1E3329] dark:bg-[#112019] dark:hover:bg-[#162920]'
                }`}
              >
                <span className={`text-sm font-semibold ${ativo ? 'text-[#0B7A45] dark:text-[#34D399]' : 'text-[#111C16] dark:text-[#ECF3EE]'}`}>
                  {p.titulo}
                </span>
                <span className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
                  {p.resumo}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacidade e autorização de localização (LGPD) */}
      {activeRole === 'cliente' ? (
        <LocationConsentCard
          mode="cliente"
          clienteId={userId}
          clienteCidade={clienteSelfQuery.data?.cidade}
          clienteBairro={clienteSelfQuery.data?.bairro}
          consentimento={clienteSelfQuery.data?.localizacaoConsentimento}
          loading={clienteSelfQuery.isPending}
          isOffline={isOffline}
        />
      ) : (
        <div className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0F9D58]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              Privacidade e localização por consentimento (LGPD)
            </h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#54665C] dark:text-[#96ACA0]">
            O painel administrativo exibe <strong>somente a última localização ativa</strong> do cliente e apenas enquanto a autorização estiver ativa no Portal do Cliente. Nenhum histórico de rotas é armazenado e a revogação pelo cliente apaga imediatamente as coordenadas visíveis.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
        <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
          Aparência e acessibilidade
        </h2>
        <p className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
          Personalize tema e preferências de animação do aplicativo.
        </p>

        <div className="mt-5 divide-y divide-[#EDF2EF] dark:divide-[#192D23]">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[#111C16] dark:text-[#ECF3EE]">
                Tema escuro
              </p>
              <p className="text-xs text-[#64786D] dark:text-[#869D90]">
                Alterna entre superfícies claras e modo escuro verde-profundo.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center gap-2 rounded-xl border border-[#CBD7D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE] dark:hover:bg-[#1A3327] whitespace-nowrap"
            >
              {darkMode ? (
                <>
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Usar tema claro</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Usar tema escuro</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-[#111C16] dark:text-[#ECF3EE]">
                Reduzir movimento
              </p>
              <p className="text-xs text-[#64786D] dark:text-[#869D90]">
                Substitui o shimmer e giros por transições suaves de opacidade.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={onToggleReducedMotion}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                reducedMotion ? 'bg-[#0F9D58]' : 'bg-[#CBD7D0] dark:bg-[#243D31]'
              }`}
            >
              <span className="sr-only">Reduzir movimento</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  reducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
        <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
          Dados locais e conexão
        </h2>
        <p className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
          Dados sensíveis como CPF completo e documentos nunca são salvos no cache offline.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRecheckConnection}
            className="inline-flex items-center gap-2 rounded-xl border border-[#CBD7D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE] dark:hover:bg-[#1A3327]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Verificar conexão agora</span>
          </button>

          <button
            type="button"
            onClick={() => void handleClearCache()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:bg-[#1B1214] dark:text-red-300 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Limpar cache local</span>
          </button>
        </div>
      </div>
    </div>
  );
}
