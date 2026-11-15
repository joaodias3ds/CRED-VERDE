import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import {
  DataState,
  EmptyState,
  Skeleton,
  SkeletonDataTable,
  type DataViewStatus,
} from '@emprestimo/ui';
import {
  STALE_TIMES,
  formatCurrencyBRL,
  type ReportSummary,
} from '@emprestimo/api-client';
import { StatCard } from '../components/StatCard';
import { ChartCard } from '../components/ChartCard';

export function RelatoriosPage() {
  const [simularErroGrafico, setSimularErroGrafico] = useState(false);

  const resumoQuery = useQuery<ReportSummary>({
    queryKey: ['relatorios', 'resumo'],
    staleTime: STALE_TIMES.relatorios,
    queryFn: async () => {
      const res = await fetch('/api/relatorios');
      if (!res.ok) throw new Error('relatorios_resumo_error');
      return res.json();
    },
  });

  const graficoQuery = useQuery<ReportSummary>({
    queryKey: ['relatorios', 'grafico', simularErroGrafico],
    staleTime: STALE_TIMES.relatorios,
    retry: false,
    queryFn: async () => {
      const res = await fetch(simularErroGrafico ? '/api/relatorios?fail=1' : '/api/relatorios');
      if (!res.ok) throw new Error('relatorios_grafico_error');
      return res.json();
    },
  });

  const resumo = resumoQuery.data;
  const resumoStatus: DataViewStatus = resumoQuery.isPending
    ? 'carregando'
    : resumoQuery.isError
      ? 'erro'
      : !resumo
        ? 'vazio'
        : 'sucesso';

  const graficoStatus: DataViewStatus = graficoQuery.isPending
    ? 'carregando'
    : graficoQuery.isError
      ? 'erro'
      : !graficoQuery.data?.fluxoMensal?.length
        ? 'vazio'
        : 'sucesso';

  const dist = resumo?.distribuicaoStatus ?? [];
  const emDiaPct = dist.find((d) => d.categoria === 'Em dia')?.percentual ?? 0;
  const atrasoPct = dist.find((d) => d.categoria === 'Em atraso')?.percentual ?? 0;
  const quitadoPct = dist.find((d) => d.categoria === 'Quitados')?.percentual ?? 0;

  const r = 46;
  const c = 2 * Math.PI * r;
  const seg1 = (emDiaPct / 100) * c;
  const seg2 = (atrasoPct / 100) * c;
  const seg3 = (quitadoPct / 100) * c;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titulo="Carteira total"
          valorFormatado={resumo ? formatCurrencyBRL(resumo.carteiraTotal) : undefined}
          icone={<Wallet className="h-4 w-4" aria-hidden="true" />}
          status={resumoStatus}
          microGrafico="sparkline"
          onTentarNovamente={() => void resumoQuery.refetch()}
        />
        <StatCard
          titulo="Juros projetados"
          valorFormatado={resumo ? formatCurrencyBRL(resumo.jurosProjetados) : undefined}
          icone={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          status={resumoStatus}
          destaque="positivo"
          microGrafico="bars"
          serie={[2400, 2900, 3200, 3600, 3900, Math.max(4100, resumo?.jurosProjetados ?? 4100)]}
          onTentarNovamente={() => void resumoQuery.refetch()}
        />
        <StatCard
          titulo="Taxa de recuperação"
          valorFormatado={resumo ? `${resumo.taxaRecuperacaoPct.toFixed(1).replace('.', ',')}%` : undefined}
          icone={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          status={resumoStatus}
          microGrafico="progress"
          progressoPct={Math.round(resumo?.taxaRecuperacaoPct ?? 83)}
          onTentarNovamente={() => void resumoQuery.refetch()}
        />
        <StatCard
          titulo="Ticket médio"
          valorFormatado={resumo ? formatCurrencyBRL(resumo.ticketMedio) : undefined}
          icone={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
          status={resumoStatus}
          microGrafico="bars"
          serie={[3800, 4100, 4400, 4300, 4700, Math.max(4800, resumo?.ticketMedio ?? 4800)]}
          onTentarNovamente={() => void resumoQuery.refetch()}
        />
      </div>

      {/* Bento de gráficos: Barra (8 cols) + Anel Donut (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8">
          <ChartCard
            titulo="Evolução de desembolso e recebimento"
            subtitulo="Série histórica dos últimos 6 meses"
            dados={graficoQuery.data?.fluxoMensal}
            status={graficoStatus}
            onTentarNovamente={() => {
              if (simularErroGrafico) {
                setSimularErroGrafico(false);
              } else {
                void graficoQuery.refetch();
              }
            }}
          />
        </div>

        <div className="lg:col-span-4">
          <DataState
            status={resumoStatus}
            skeleton={
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[#DCE3DF] bg-white p-6 dark:border-[#192D23] dark:bg-[#0D1A14]">
                <Skeleton width={120} height={120} rounded="full" />
                <Skeleton width="60%" height={14} rounded="sm" className="mt-4" />
              </div>
            }
            vazio={<EmptyState titulo="Sem composição disponível" />}
            onTentarNovamente={() => void resumoQuery.refetch()}
          >
            <div className="flex h-full flex-col justify-between rounded-2xl border border-[#DCE3DF] bg-white p-5 dark:border-[#192D23] dark:bg-[#0D1A14]">
              <div>
                <h3 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                  Composição da carteira
                </h3>
                <p className="text-xs text-[#64786D] dark:text-[#869D90]">
                  Distribuição por situação atual
                </p>
              </div>

              <div className="my-4 flex items-center justify-center">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90" aria-hidden="true">
                    <circle cx="60" cy="60" r={r} fill="none" stroke="#E5EAE7" className="dark:stroke-[#1B2E25]" strokeWidth="14" />
                    <circle
                      cx="60"
                      cy="60"
                      r={r}
                      fill="none"
                      stroke="#0F9D58"
                      strokeWidth="14"
                      strokeDasharray={`${seg1} ${c}`}
                      strokeDashoffset={0}
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={r}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="14"
                      strokeDasharray={`${seg2} ${c}`}
                      strokeDashoffset={-seg1}
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={r}
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="14"
                      strokeDasharray={`${seg3} ${c}`}
                      strokeDashoffset={-(seg1 + seg2)}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-mono text-xl font-bold text-[#111C16] dark:text-[#ECF3EE]">
                      {emDiaPct}%
                    </span>
                    <p className="text-[10px] text-[#64786D] dark:text-[#869D90]">Em dia</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: 'Em dia', pct: emDiaPct, color: 'bg-[#0F9D58]' },
                  { label: 'Em atraso', pct: atrasoPct, color: 'bg-[#D97706]' },
                  { label: 'Quitados', pct: quitadoPct, color: 'bg-[#4ADE80]' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[#54665C] dark:text-[#96ACA0]">
                      <span className={`h-2.5 w-2.5 rounded-sm ${row.color}`} aria-hidden="true" />
                      {row.label}
                    </span>
                    <span className="font-mono font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                      {row.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </DataState>
        </div>
      </div>

      <DataState
        status={resumoStatus}
        skeleton={
          <SkeletonDataTable
            headers={['Situação da carteira', 'Volume financeiro', 'Participação']}
            rows={3}
          />
        }
        vazio={
          <EmptyState
            titulo="Sem dados para consolidar"
            descricao="Os relatórios serão gerados conforme os empréstimos forem criados."
          />
        }
        onTentarNovamente={() => void resumoQuery.refetch()}
      >
        <div className="overflow-hidden rounded-2xl border border-[#DCE3DF] bg-white dark:border-[#192D23] dark:bg-[#0D1A14]">
          <div className="border-b border-[#DCE3DF] px-5 py-3.5 dark:border-[#192D23]">
            <h3 className="text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              Detalhamento financeiro por situação
            </h3>
          </div>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#DCE3DF] bg-[#F7FAF8] text-xs font-semibold text-[#54665C] dark:border-[#192D23] dark:bg-[#112019] dark:text-[#96ACA0]">
                <th className="px-5 py-3">Situação da carteira</th>
                <th className="px-5 py-3 text-right">Volume financeiro</th>
                <th className="px-5 py-3 text-right">Participação</th>
              </tr>
            </thead>
            <tbody>
              {dist.map((item) => (
                <tr
                  key={item.categoria}
                  className="border-b border-[#EDF2EF] last:border-b-0 dark:border-[#172B21]"
                >
                  <td className="px-5 py-3.5 font-medium text-[#111C16] dark:text-[#ECF3EE]">
                    {item.categoria}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
                    {formatCurrencyBRL(item.valor)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono tabular-nums text-[#54665C] dark:text-[#96ACA0]">
                    {item.percentual}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}
