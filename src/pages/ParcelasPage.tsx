import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react';
import {
  DataState,
  EmptyState,
  LoadingButton,
  SkeletonFooterMore,
  SkeletonList,
  strings,
  type DataViewStatus,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  formatCurrencyBRL,
  formatDateBR,
  type Installment,
  type InstallmentStatus,
} from '@emprestimo/api-client';

export interface ParcelasPageProps {
  isOffline: boolean;
  filterClienteId?: string;
}

const filtros: Array<{ id: 'todas' | InstallmentStatus; label: string }> = [
  { id: 'todas', label: 'Todas' },
  { id: 'atrasada', label: 'Atrasadas' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'paga', label: 'Pagas' },
];

export function ParcelasPage({ isOffline, filterClienteId }: ParcelasPageProps) {
  const qc = useQueryClient();
  const [statusFiltro, setStatusFiltro] = useState<'todas' | InstallmentStatus>('todas');
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(6);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = useQuery<Installment[]>({
    queryKey: ['parcelas', statusFiltro, filterClienteId ?? ''],
    staleTime: STALE_TIMES.parcelas,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFiltro !== 'todas') params.set('status', statusFiltro);
      const res = await fetch(`/api/parcelas?${params.toString()}`);
      if (!res.ok) throw new Error('parcelas_error');
      const data = (await res.json()) as Installment[];
      return filterClienteId ? data.filter((p) => p.clienteId === filterClienteId) : data;
    },
  });

  const baseItems = query.data ?? [];

  // Agenda visual de vencimentos (inspirada na referência de calendário)
  const datasAgenda = Array.from(new Set(baseItems.map((p) => p.vencimento))).sort();
  const allItems = dataSelecionada
    ? baseItems.filter((p) => p.vencimento === dataSelecionada)
    : baseItems;

  const visibleItems = allItems.slice(0, visibleLimit);
  const hasMore = allItems.length > visibleLimit;

  const viewStatus: DataViewStatus = query.isPending
    ? 'carregando'
    : query.isError
      ? 'erro'
      : allItems.length === 0
        ? 'vazio'
        : 'sucesso';

  const confirmarPagamento = async (parcelaId: string, idempotencyKey: string) => {
    const res = await fetch(`/api/parcelas/${parcelaId}/pagar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ formaPagamento: 'PIX' }),
    });
    if (!res.ok) throw new Error('payment_failed');
    await qc.invalidateQueries({ queryKey: ['parcelas'] });
    await qc.invalidateQueries({ queryKey: ['dashboard'] });
    await qc.invalidateQueries({ queryKey: ['emprestimos'] });
    await qc.invalidateQueries({ queryKey: ['clientes'] });
    await qc.invalidateQueries({ queryKey: ['cliente'] });
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    window.setTimeout(() => {
      setVisibleLimit((prev) => prev + 6);
      setLoadingMore(false);
    }, 350);
  };

  return (
    <div className="space-y-5">
      {/* Agenda de vencimentos por dia (inspirada na referência Calendar) */}
      {!query.isPending && datasAgenda.length > 0 && (
        <section
          aria-label="Agenda de vencimentos"
          className="rounded-2xl border border-[#1E3329] bg-[#0D1913] p-4 text-white"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#96ACA0]">
              <Calendar className="h-3.5 w-3.5 text-[#4ADE80]" aria-hidden="true" />
              <span>Agenda de vencimentos</span>
            </div>
            {dataSelecionada && (
              <button
                type="button"
                onClick={() => setDataSelecionada(null)}
                className="text-xs font-semibold text-[#4ADE80] hover:underline"
              >
                Mostrar todas as datas
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {datasAgenda.map((iso) => {
              const noDia = baseItems.filter((p) => p.vencimento === iso);
              const totalDia = noDia.reduce((acc, p) => acc + p.valor, 0);
              const temAtrasada = noDia.some((p) => p.status === 'atrasada');
              const todasPagas = noDia.every((p) => p.status === 'paga');
              const active = dataSelecionada === iso;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDataSelecionada(active ? null : iso)}
                  className={`flex min-w-[132px] shrink-0 flex-col rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-[#0F9D58] bg-[#0F9D58] text-white'
                      : 'border-[#1E3329] bg-[#13241B] text-[#ECF3EE] hover:border-[#2C4A3B]'
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">
                    {formatDateBR(iso)}
                  </span>
                  <span className="mt-1 font-mono text-sm font-bold tabular-nums">
                    {formatCurrencyBRL(totalDia)}
                  </span>
                  <span
                    className={`mt-1 text-[11px] font-medium ${
                      active
                        ? 'text-white/90'
                        : temAtrasada
                          ? 'text-red-400'
                          : todasPagas
                            ? 'text-[#4ADE80]'
                            : 'text-amber-300'
                    }`}
                  >
                    {noDia.length} {noDia.length === 1 ? 'parcela' : 'parcelas'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-[#EAF0EC] p-1 dark:bg-[#13261D]">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setStatusFiltro(f.id);
                setDataSelecionada(null);
                setVisibleLimit(6);
              }}
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

        <span className="text-xs text-[#64786D] dark:text-[#869D90]">
          {query.isPending ? strings.lista.carregando : `${allItems.length} parcelas listadas`}
        </span>
      </div>

      <DataState
        status={viewStatus}
        skeleton={<SkeletonList count={6} />}
        vazio={
          <EmptyState
            titulo="Nenhuma parcela encontrada"
            descricao="Não há parcelas para o filtro selecionado."
          />
        }
        onTentarNovamente={() => void query.refetch()}
      >
        <div className="flex flex-col gap-3">
          {visibleItems.map((p) => {
            const paga = p.status === 'paga';
            const atrasada = p.status === 'atrasada';

            return (
              <div
                key={p.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[#DCE3DF] bg-white p-4 sm:flex-row sm:items-center dark:border-[#192D23] dark:bg-[#0D1A14]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#54665C] dark:text-[#96ACA0]">
                    <span className="font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                      Parcela {p.numero}/{p.totalParcelas}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{p.emprestimoCodigo}</span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                    {p.clienteNome}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-[#64786D] dark:text-[#869D90]">
                      Vencimento: {formatDateBR(p.vencimento)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        paga
                          ? 'text-[#0B7A45] dark:text-[#34D399]'
                          : atrasada
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {paga ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : atrasada ? (
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {paga
                        ? `Paga em ${formatDateBR(p.pagoEm ?? p.vencimento)}`
                        : atrasada
                          ? 'Em atraso'
                          : 'Aguardando pagamento'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="font-mono text-base font-semibold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                    {formatCurrencyBRL(p.valor)}
                  </span>

                  {!paga && (
                    <LoadingButton
                      disabled={isOffline}
                      loadingLabel={strings.acao.salvando}
                      successToastMessage={`Parcela ${p.numero}/${p.totalParcelas} baixada com sucesso.`}
                      errorToastMessage="Não foi possível confirmar o pagamento."
                      onAction={(key) => confirmarPagamento(p.id, key)}
                    >
                      {strings.acao.confirmarPagamento}
                    </LoadingButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {loadingMore && <SkeletonFooterMore />}
        {hasMore && !loadingMore && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="rounded-xl border border-[#CBD7D0] bg-white px-4 py-2 text-xs font-semibold text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:bg-[#0D1A14] dark:text-[#ECF3EE] dark:hover:bg-[#13261D]"
            >
              Carregar mais parcelas
            </button>
          </div>
        )}
      </DataState>
    </div>
  );
}
