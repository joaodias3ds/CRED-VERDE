import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldOff,
} from 'lucide-react';
import {
  DataState,
  EmptyState,
  SkeletonList,
  SkeletonText,
  strings,
  type DataViewStatus,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  formatCurrencyBRL,
  formatDateBR,
  resolveSharedLocationConsent,
  type Customer,
  type CustomerStatus,
} from '@emprestimo/api-client';
import { FadeImage } from '../components/FadeImage';
import { ScoreGauge } from '../components/ScoreGauge';
import { PixCopyBox } from '../components/PixCopyBox';
import { LocationConsentCard } from '../components/LocationConsentCard';

export interface ClientesPageProps {
  isOffline: boolean;
  onSelecionarCliente: (clienteId: string) => void;
  onAbrirNovoCliente: () => void;
}

const statusFiltros: Array<{ id: 'todos' | CustomerStatus; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'ativo', label: 'Ativos' },
  { id: 'atraso', label: 'Em atraso' },
  { id: 'quitado', label: 'Quitados' },
];

export function ClientesPage({
  isOffline,
  onSelecionarCliente,
  onAbrirNovoCliente,
}: ClientesPageProps) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | CustomerStatus>('todos');
  const [ativoId, setAtivoId] = useState<string | null>(null);

  const query = useQuery<Customer[]>({
    queryKey: ['clientes', statusFiltro, busca],
    staleTime: STALE_TIMES.clientes,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFiltro !== 'todos') params.set('status', statusFiltro);
      if (busca.trim()) params.set('q', busca.trim());
      const res = await fetch(`/api/clientes?${params.toString()}`);
      if (!res.ok) throw new Error('clientes_error');
      return res.json();
    },
  });

  const lista = query.data ?? [];

  useEffect(() => {
    if (lista.length > 0 && (!ativoId || !lista.some((c) => c.id === ativoId))) {
      setAtivoId(lista[0].id);
    }
  }, [lista, ativoId]);

  const selecionado = lista.find((c) => c.id === ativoId) ?? lista[0] ?? null;

  const viewStatus: DataViewStatus = query.isPending
    ? 'carregando'
    : query.isError
      ? 'erro'
      : lista.length === 0
        ? 'vazio'
        : 'sucesso';

  const isRefiltering = query.isFetching && !query.isPending;

  return (
    <div className="space-y-5">
      {/* Barra de busca + filtros + CTA */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64786D]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome, cidade ou CPF…"
            aria-label="Buscar cliente"
            className="w-full rounded-xl border border-[#CBD7D0] bg-white py-2.5 pl-9 pr-3 text-sm text-[#111C16] focus:border-[#0F9D58] focus:outline-none dark:border-[#243D31] dark:bg-[#0D1A14] dark:text-[#ECF3EE]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-[#EAF0EC] p-1 dark:bg-[#13261D]">
            {statusFiltros.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFiltro(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFiltro === f.id
                    ? 'bg-white text-[#111C16] shadow-sm dark:bg-[#0D1A14] dark:text-[#ECF3EE]'
                    : 'text-[#54665C] hover:text-[#111C16] dark:text-[#96ACA0] dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isOffline}
            onClick={onAbrirNovoCliente}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B7A45] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#096438] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{strings.acao.cadastrarCliente}</span>
          </button>
        </div>
      </div>

      {/* Barra fina de progresso no topo durante busca/filtro */}
      {isRefiltering && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#DCE3DF] dark:bg-[#1E3329]">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-[#0F9D58]" />
        </div>
      )}

      <div className={`transition-opacity duration-150 ${isRefiltering ? 'opacity-65' : 'opacity-100'}`}>
        <DataState
          status={viewStatus}
          skeleton={
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <SkeletonList count={5} />
              </div>
              <div className="hidden rounded-2xl border border-[#DCE3DF] bg-white p-6 lg:col-span-7 lg:block dark:border-[#192D23] dark:bg-[#0D1A14]">
                <SkeletonText lines={5} />
              </div>
            </div>
          }
          vazio={
            <EmptyState
              titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
              descricao={
                busca
                  ? 'Tente buscar por outro nome ou limpar os filtros.'
                  : 'Cadastre seu primeiro cliente para simular e liberar empréstimos.'
              }
              acaoLabel={busca ? 'Limpar busca' : strings.acao.cadastrarCliente}
              onAcao={() => {
                if (busca) {
                  setBusca('');
                  setStatusFiltro('todos');
                } else {
                  onAbrirNovoCliente();
                }
              }}
            />
          }
          onTentarNovamente={() => void query.refetch()}
        >
          {/* Workspace Mestre-Detalhe inspirado na referência Finnova */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* Lista mestre em superfície escura contrastante */}
            <div className="rounded-2xl border border-[#1E3329] bg-[#0D1913] p-4 text-white lg:col-span-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-[#96ACA0]">
                  Carteira de clientes ({lista.length})
                </span>
                <span className="text-[11px] text-[#64786D]">
                  Selecione para inspecionar
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {lista.map((c) => {
                  const isSelected = selecionado?.id === c.id;
                  const locConsent = resolveSharedLocationConsent(c.localizacaoConsentimento);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAtivoId(c.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border-[#0F9D58] bg-[#0F9D58] text-white shadow-sm'
                          : 'border-[#1B2E25] bg-[#13241B] text-[#ECF3EE] hover:border-[#2C4A3B]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FadeImage
                          src={c.avatarUrl}
                          alt={`Foto de ${c.nome}`}
                          containerClassName="h-10 w-10 rounded-full shrink-0"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {c.nome}
                          </p>
                          <p className={`truncate font-mono text-xs ${isSelected ? 'text-white/85' : 'text-[#8AA396]'}`}>
                            {c.cidade} · Score {c.score}
                          </p>
                          <p className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium ${
                            isSelected
                              ? 'text-white/90'
                              : locConsent.autorizada
                                ? 'text-[#4ADE80]'
                                : locConsent.status === 'revogada'
                                  ? 'text-amber-300'
                                  : 'text-[#64786D]'
                          }`}>
                            {locConsent.autorizada ? (
                              <>
                                <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                                <span>Loc. autorizada</span>
                              </>
                            ) : locConsent.status === 'revogada' ? (
                              <>
                                <ShieldOff className="h-2.5 w-2.5" aria-hidden="true" />
                                <span>Loc. revogada</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                                <span>Sem autorização GPS</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold tabular-nums">
                          {formatCurrencyBRL(c.saldoDevedor)}
                        </p>
                        <span
                          className={`text-[11px] font-medium ${
                            isSelected
                              ? 'text-white/90'
                              : c.status === 'atraso'
                                ? 'text-red-400'
                                : c.status === 'quitado'
                                  ? 'text-[#4ADE80]'
                                  : 'text-[#8AA396]'
                          }`}
                        >
                          {c.status === 'atraso'
                            ? 'Em atraso'
                            : c.status === 'quitado'
                              ? 'Quitado'
                              : 'Em dia'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Painel de detalhe instantâneo (7 cols) */}
            {selecionado && (
              <div className="space-y-4 rounded-2xl border border-[#DCE3DF] bg-white p-6 lg:col-span-7 dark:border-[#192D23] dark:bg-[#0D1A14]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDF2EF] pb-4 dark:border-[#192D23]">
                  <div className="flex items-center gap-3.5">
                    <FadeImage
                      src={selecionado.avatarUrl}
                      alt={`Foto de ${selecionado.nome}`}
                      containerClassName="h-12 w-12 rounded-full shrink-0"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="text-lg font-bold text-[#111C16] dark:text-[#ECF3EE]">
                        {selecionado.nome}
                      </h2>
                      <p className="text-xs text-[#54665C] dark:text-[#96ACA0]">
                        <span className="font-mono">{selecionado.cpfMascarado}</span> · {selecionado.telefone} · {selecionado.cidade}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelecionarCliente(selecionado.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E1E16] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#173224] dark:bg-[#0F9D58] dark:hover:bg-[#0B7A45] whitespace-nowrap"
                  >
                    <span>Abrir ficha completa</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-stretch">
                  <ScoreGauge score={selecionado.score} />

                  <div className="flex flex-col justify-between rounded-xl border border-[#DCE3DF] bg-[#F8FAF9] p-5 dark:border-[#1E3329] dark:bg-[#112019]">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#64786D] dark:text-[#869D90]">Situação</span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            selecionado.status === 'atraso'
                              ? 'text-red-600 dark:text-red-400'
                              : selecionado.status === 'quitado'
                                ? 'text-[#0B7A45] dark:text-[#34D399]'
                                : 'text-[#111C16] dark:text-[#ECF3EE]'
                          }`}
                        >
                          {selecionado.status === 'atraso' && <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                          {selecionado.status === 'quitado' && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                          {selecionado.status === 'atraso'
                            ? 'Em atraso'
                            : selecionado.status === 'quitado'
                              ? 'Quitado'
                              : 'Em dia'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#64786D] dark:text-[#869D90]">Limite aprovado</span>
                        <span className="font-mono font-semibold text-[#0B7A45] dark:text-[#34D399]">
                          {formatCurrencyBRL(selecionado.limiteCredito)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#64786D] dark:text-[#869D90]">Saldo devedor</span>
                        <span className="font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                          {formatCurrencyBRL(selecionado.saldoDevedor)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#64786D] dark:text-[#869D90]">Cliente desde</span>
                        <span className="font-mono text-xs text-[#54665C] dark:text-[#96ACA0]">
                          {formatDateBR(selecionado.criadoEm)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de utilização do limite */}
                    <div className="mt-4 pt-3 border-t border-[#E5EAE7] dark:border-[#1E3329]">
                      <div className="flex justify-between text-[11px] text-[#64786D] dark:text-[#869D90]">
                        <span>Uso do limite</span>
                        <span className="font-mono">
                          {Math.min(
                            100,
                            Math.round((selecionado.saldoDevedor / Math.max(1, selecionado.limiteCredito)) * 100),
                          )}
                          %
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E5EAE7] dark:bg-[#1B2E25]">
                        <div
                          className="h-full rounded-full bg-[#0F9D58]"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((selecionado.saldoDevedor / Math.max(1, selecionado.limiteCredito)) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <LocationConsentCard
                  mode="admin"
                  clienteId={selecionado.id}
                  clienteCidade={selecionado.cidade}
                  clienteBairro={selecionado.bairro}
                  consentimento={selecionado.localizacaoConsentimento}
                  compact
                />

                <PixCopyBox
                  titulo="Chave PIX cadastrada"
                  chavePix={selecionado.chavePix}
                />
              </div>
            )}
          </div>
        </DataState>
      </div>
    </div>
  );
}
