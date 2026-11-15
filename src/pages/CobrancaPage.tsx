import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, MapPin } from 'lucide-react';
import {
  DataState,
  EmptyState,
  LoadingButton,
  SkeletonList,
  strings,
  useToast,
  type DataViewStatus,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  formatCurrencyBRL,
  type CollectionVisit,
  type OfflineQueuedAction,
} from '@emprestimo/api-client';

export interface CobrancaPageProps {
  isOffline: boolean;
  onQueueOfflineAction: (
    action: Omit<OfflineQueuedAction, 'id' | 'criadoEm' | 'idempotencyKey'> & {
      idempotencyKey?: string;
    },
  ) => Promise<OfflineQueuedAction>;
}

export function CobrancaPage({ isOffline, onQueueOfflineAction }: CobrancaPageProps) {
  const qc = useQueryClient();
  const { mostrarToast } = useToast();
  const [offlineMarkedIds, setOfflineMarkedIds] = useState<string[]>([]);

  const query = useQuery<CollectionVisit[]>({
    queryKey: ['cobrancas'],
    staleTime: STALE_TIMES.cobranca,
    queryFn: async () => {
      const res = await fetch('/api/cobrancas');
      if (!res.ok) throw new Error('cobrancas_error');
      return res.json();
    },
  });

  const visitas = query.data ?? [];
  const viewStatus: DataViewStatus = query.isPending
    ? 'carregando'
    : query.isError
      ? 'erro'
      : visitas.length === 0
        ? 'vazio'
        : 'sucesso';

  const registrarCheckin = async (visit: CollectionVisit, idempotencyKey: string) => {
    if (isOffline) {
      await onQueueOfflineAction({
        tipo: 'registrar_checkin',
        endpoint: `/api/cobrancas/${visit.id}/checkin`,
        payload: { status: 'visitado', observacao: 'Check-in registrado em campo (offline).' },
        idempotencyKey,
      });
      setOfflineMarkedIds((prev) => [...prev, visit.id]);
      mostrarToast({
        variante: 'aviso',
        mensagem: 'Visita salva na fila offline. Será enviada quando a conexão voltar.',
      });
      return;
    }

    const res = await fetch(`/api/cobrancas/${visit.id}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        status: 'visitado',
        observacao: 'Visita realizada pelo cobrador.',
      }),
    });
    if (!res.ok) throw new Error('checkin_failed');
    await qc.invalidateQueries({ queryKey: ['cobrancas'] });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Roteiro de mapa com placeholder neutro "Carregando mapa…" enquanto carrega (Seção 5.2) */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
          <h2 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
            Rota do dia
          </h2>
          <p className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
            Ordem sugerida de visitas por região
          </p>

          {query.isPending ? (
            <div
              aria-busy="true"
              className="mt-4 flex h-64 flex-col items-center justify-center rounded-xl border border-[#DCE3DF] bg-[#E5EAE7] text-center dark:border-[#1E3329] dark:bg-[#1B2E25]"
            >
              <MapPin className="h-7 w-7 text-[#54665C] dark:text-[#96ACA0]" aria-hidden="true" />
              <span className="mt-2 text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
                {strings.offline.mapaCarregando}
              </span>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#DCE3DF] bg-[#F2F6F4] p-4 dark:border-[#1E3329] dark:bg-[#13261D]">
              <svg viewBox="0 0 320 210" className="h-52 w-full" aria-label="Mapa esquemático da rota de cobrança">
                <path
                  d="M25 160 Q 100 110, 160 120 T 290 50"
                  fill="none"
                  stroke="#0F9D58"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
                {visitas.map((v, i) => {
                  const coords = [
                    { x: 45, y: 150 },
                    { x: 165, y: 118 },
                    { x: 275, y: 58 },
                  ][i % 3];
                  return (
                    <g key={v.id}>
                      <circle cx={coords.x} cy={coords.y} r="12" fill="#0B7A45" />
                      <text
                        x={coords.x}
                        y={coords.y + 4}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {i + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="mt-2 flex items-center justify-between text-xs text-[#54665C] dark:text-[#96ACA0]">
                <span>{visitas.length} paradas programadas</span>
                <span className="font-mono">Zona Sul · ABC</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de cobranças */}
      <div className="lg:col-span-3">
        <DataState
          status={viewStatus}
          skeleton={<SkeletonList count={4} />}
          vazio={
            <EmptyState
              titulo="Nenhuma cobrança agendada"
              descricao="Todas as visitas previstas para hoje já foram concluídas."
            />
          }
          onTentarNovamente={() => void query.refetch()}
        >
          <div className="flex flex-col gap-3">
            {visitas.map((v, idx) => {
              const queuedOffline = offlineMarkedIds.includes(v.id);
              const visitado = v.status === 'visitado' || v.status === 'pago';

              return (
                <div
                  key={v.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#DCE3DF] bg-white p-4 sm:flex-row sm:items-center dark:border-[#1E3329] dark:bg-[#0F1E17]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#54665C] dark:text-[#96ACA0]">
                      <span className="font-mono font-semibold text-[#0B7A45] dark:text-[#34D399]">
                        Parada #{idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{v.horarioPrevisto}</span>
                      {v.diasAtraso > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {v.diasAtraso} dias de atraso
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                      {v.clienteNome}
                    </p>
                    <p className="mt-0.5 text-xs text-[#64786D] dark:text-[#869D90]">
                      {v.endereco} · {v.bairro}
                    </p>
                    {v.observacao && (
                      <p className="mt-1 text-xs text-[#54665C] dark:text-[#96ACA0]">
                        {v.observacao}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <span className="font-mono text-base font-semibold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                      {formatCurrencyBRL(v.valorEmAberto)}
                    </span>

                    {queuedOffline ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        Aguardando sincronização
                      </span>
                    ) : visitado ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0B7A45] dark:text-[#34D399]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Visita registrada
                      </span>
                    ) : (
                      <LoadingButton
                        loadingLabel={strings.acao.salvando}
                        successToastMessage={isOffline ? undefined : 'Visita registrada com sucesso.'}
                        onAction={(key) => registrarCheckin(v, key)}
                        className="px-3 py-1.5 text-xs"
                      >
                        {strings.acao.registrarCheckin}
                      </LoadingButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DataState>
      </div>
    </div>
  );
}
