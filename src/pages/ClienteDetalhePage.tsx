import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileCheck2 } from 'lucide-react';
import {
  DataState,
  EmptyState,
  Skeleton,
  SkeletonText,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  formatCurrencyBRL,
  formatDateBR,
  type Customer,
  type Loan,
} from '@emprestimo/api-client';
import { FadeImage } from '../components/FadeImage';
import { ScoreGauge } from '../components/ScoreGauge';
import { PixCopyBox } from '../components/PixCopyBox';
import { Timeline } from '../components/Timeline';
import { LocationConsentCard } from '../components/LocationConsentCard';

export interface ClienteDetalhePageProps {
  clienteId: string;
  onVoltar: () => void;
}

type FichaTab = 'visao' | 'emprestimos' | 'documentos' | 'historico';

export function ClienteDetalhePage({ clienteId, onVoltar }: ClienteDetalhePageProps) {
  const [aba, setAba] = useState<FichaTab>('visao');

  const clienteQuery = useQuery<Customer>({
    queryKey: ['cliente', clienteId],
    staleTime: STALE_TIMES.clientes,
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${clienteId}`);
      if (!res.ok) throw new Error('cliente_error');
      return res.json();
    },
  });

  const loansQuery = useQuery<Loan[]>({
    queryKey: ['emprestimos', 'cliente', clienteId],
    staleTime: STALE_TIMES.emprestimos,
    queryFn: async () => {
      const res = await fetch(`/api/emprestimos?clienteId=${clienteId}`);
      if (!res.ok) throw new Error('loans_error');
      return res.json();
    },
  });

  const c = clienteQuery.data;
  const loading = clienteQuery.isPending;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onVoltar}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#0B7A45] hover:underline dark:text-[#34D399]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Voltar para clientes</span>
      </button>

      {/* Cabeçalho da ficha: foto, nome e status em skeleton enquanto carrega (Seção 5.2) */}
      <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
        {loading ? (
          <div className="flex items-center gap-4" aria-busy="true">
            <Skeleton width={56} height={56} rounded="full" className="shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton width="45%" height={20} rounded="sm" />
              <Skeleton width="65%" height={14} rounded="sm" />
            </div>
          </div>
        ) : clienteQuery.isError ? (
          <DataState
            status="erro"
            skeleton={null}
            vazio={null}
            onTentarNovamente={() => void clienteQuery.refetch()}
          >
            {null}
          </DataState>
        ) : c ? (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <FadeImage
                src={c.avatarUrl}
                alt={`Foto de ${c.nome}`}
                containerClassName="h-14 w-14 rounded-full shrink-0"
                className="h-14 w-14 rounded-full object-cover"
              />
              <div>
                <h2 className="text-lg font-bold text-[#111C16] dark:text-[#ECF3EE]">
                  {c.nome}
                </h2>
                <p className="text-xs text-[#54665C] dark:text-[#96ACA0]">
                  <span className="font-mono">{c.cpfMascarado}</span> · {c.telefone} · {c.cidade}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-[#64786D] dark:text-[#869D90]">Saldo devedor</span>
              <span className="font-mono text-xl font-bold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                {formatCurrencyBRL(c.saldoDevedor)}
              </span>
            </div>
          </div>
        ) : null}

        {/* Abas já visíveis imediatamente mesmo durante carregamento (Seção 5.2) */}
        <div role="tablist" aria-label="Seções da ficha do cliente" className="mt-5 flex flex-wrap gap-2 border-t border-[#EDF2EF] pt-4 dark:border-[#192D23]">
          {(
            [
              { id: 'visao', label: 'Visão Geral' },
              { id: 'emprestimos', label: 'Empréstimos' },
              { id: 'documentos', label: 'Documentos' },
              { id: 'historico', label: 'Histórico' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={aba === tab.id}
              onClick={() => setAba(tab.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                aba === tab.id
                  ? 'bg-[#0B7A45] text-white'
                  : 'bg-[#F3F7F5] text-[#4B5D53] hover:text-[#111C16] dark:bg-[#13261D] dark:text-[#96ACA0] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das abas */}
      {aba === 'visao' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <ScoreGauge score={c?.score} loading={loading} />

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
              <h3 className="text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                Dados cadastrais e limite
              </h3>
              {loading ? (
                <div className="mt-3">
                  <SkeletonText lines={3} />
                </div>
              ) : c ? (
                <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[#64786D] dark:text-[#869D90]">E-mail</dt>
                    <dd className="font-medium text-[#111C16] dark:text-[#ECF3EE]">{c.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64786D] dark:text-[#869D90]">Endereço</dt>
                    <dd className="font-medium text-[#111C16] dark:text-[#ECF3EE]">
                      {c.bairro} · {c.cidade}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64786D] dark:text-[#869D90]">Limite aprovado</dt>
                    <dd className="font-mono font-semibold text-[#0B7A45] dark:text-[#34D399]">
                      {formatCurrencyBRL(c.limiteCredito)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#64786D] dark:text-[#869D90]">Cliente desde</dt>
                    <dd className="font-mono text-[#111C16] dark:text-[#ECF3EE]">
                      {formatDateBR(c.criadoEm)}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>

            <LocationConsentCard
              mode="admin"
              clienteId={clienteId}
              clienteCidade={c?.cidade}
              clienteBairro={c?.bairro}
              consentimento={c?.localizacaoConsentimento}
              loading={loading}
            />

            <PixCopyBox
              titulo="Chave PIX do cliente"
              chavePix={c?.chavePix}
              loading={loading}
            />
          </div>
        </div>
      )}

      {aba === 'emprestimos' && (
        <DataState
          status={
            loansQuery.isPending
              ? 'carregando'
              : loansQuery.isError
                ? 'erro'
                : (loansQuery.data?.length ?? 0) === 0
                  ? 'vazio'
                  : 'sucesso'
          }
          skeleton={
            <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
              <SkeletonText lines={4} />
            </div>
          }
          vazio={
            <EmptyState
              titulo="Nenhum contrato para este cliente"
              descricao="Os empréstimos liberados aparecerão listados aqui."
            />
          }
          onTentarNovamente={() => void loansQuery.refetch()}
        >
          <div className="space-y-3">
            {(loansQuery.data ?? []).map((loan) => (
              <div
                key={loan.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#DCE3DF] bg-white p-4 dark:border-[#1E3329] dark:bg-[#0F1E17]"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                    {loan.codigo} · {loan.periodicidade} ({loan.tipoJuros})
                  </p>
                  <p className="text-xs text-[#54665C] dark:text-[#96ACA0]">
                    {loan.parcelasPagas}/{loan.totalParcelas} parcelas pagas · Taxa {loan.taxaMensalPct}% · Multa {loan.multaAtrasoPct}% · Garantia: {loan.garantiaTipo.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                    {formatCurrencyBRL(loan.valorTotal)}
                  </p>
                  <p className="text-xs text-[#64786D] dark:text-[#869D90]">
                    Parcela de {formatCurrencyBRL(loan.valorParcela)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DataState>
      )}

      {aba === 'documentos' && (
        <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
          <h3 className="mb-4 text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
            Documentos anexados
          </h3>
          {loading ? (
            <SkeletonText lines={3} />
          ) : !c?.documentos || c.documentos.length === 0 ? (
            <EmptyState
              titulo="Nenhum documento enviado"
              descricao="Envie RG/CNH ou comprovante de residência para validação."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {c.documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="overflow-hidden rounded-xl border border-[#DCE3DF] dark:border-[#1E3329]"
                >
                  <FadeImage
                    src={doc.previewUrl}
                    alt={doc.tipo}
                    containerClassName="h-36 w-full"
                    className="h-36 w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                        {doc.tipo}
                      </p>
                      <p className="text-xs text-[#64786D] dark:text-[#869D90]">
                        {doc.nomeArquivo}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0B7A45] dark:text-[#34D399]">
                      <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                      Validado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'historico' && (
        <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
          <h3 className="mb-4 text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
            Linha do tempo do cliente
          </h3>
          <Timeline eventos={c?.historico} loading={loading} />
        </div>
      )}
    </div>
  );
}
