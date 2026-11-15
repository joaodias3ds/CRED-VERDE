import { useState } from 'react';
import {
  DataState,
  EmptyState,
  SkeletonChartCard,
  type DataViewStatus,
} from '@emprestimo/ui';
import { formatCurrencyBRL, type CashflowPoint } from '@emprestimo/api-client';

export interface ChartCardProps {
  titulo: string;
  subtitulo?: string;
  dados?: CashflowPoint[];
  status: DataViewStatus;
  onTentarNovamente?: () => void;
}

export function ChartCard({
  titulo,
  subtitulo,
  dados = [],
  status,
  onTentarNovamente,
}: ChartCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxValor = Math.max(
    1,
    ...dados.flatMap((d) => [d.emprestado, d.recebido]),
  );

  return (
    <DataState
      status={status}
      skeleton={<SkeletonChartCard titulo={titulo} />}
      vazio={
        <EmptyState
          titulo="Sem movimentação no período"
          descricao="Os gráficos aparecerão assim que houver contratos e recebimentos."
        />
      }
      onTentarNovamente={onTentarNovamente}
    >
      <div className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              {titulo}
            </h3>
            {subtitulo && (
              <p className="text-xs text-[#64786D] dark:text-[#869D90]">{subtitulo}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0F9D58]" aria-hidden="true" />
              Recebido
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#CBD7D0] dark:bg-[#2F4E3F]" aria-hidden="true" />
              Emprestado
            </span>
          </div>
        </div>

        <div className="relative flex h-52 items-end gap-3 border-b border-[#E5EAE7] pb-2 dark:border-[#1E3329]">
          {dados.map((ponto, idx) => {
            const hEmp = Math.max(8, Math.round((ponto.emprestado / maxValor) * 100));
            const hRec = Math.max(8, Math.round((ponto.recebido / maxValor) * 100));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={ponto.mes}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-md px-1 transition-colors hover:bg-[#F6F9F7] dark:hover:bg-[#13261D]"
              >
                {isHovered && (
                  <div className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-lg border border-[#DCE3DF] bg-white px-2.5 py-1.5 text-[11px] shadow-md whitespace-nowrap dark:border-[#243D31] dark:bg-[#13261D]">
                    <p className="font-semibold text-[#111C16] dark:text-[#ECF3EE]">
                      {ponto.mes}
                    </p>
                    <p className="font-mono text-[#0B7A45] dark:text-[#34D399]">
                      Rec: {formatCurrencyBRL(ponto.recebido)}
                    </p>
                    <p className="font-mono text-[#54665C] dark:text-[#96ACA0]">
                      Emp: {formatCurrencyBRL(ponto.emprestado)}
                    </p>
                  </div>
                )}

                <div className="flex h-full w-full items-end justify-center gap-1.5 pt-4">
                  <div
                    className="w-4 sm:w-5 rounded-t bg-[#CBD7D0] transition-all duration-200 dark:bg-[#2F4E3F]"
                    style={{ height: `${hEmp}%` }}
                    title={`Emprestado em ${ponto.mes}: ${formatCurrencyBRL(ponto.emprestado)}`}
                  />
                  <div
                    className="w-4 sm:w-5 rounded-t bg-[#0F9D58] transition-all duration-200"
                    style={{ height: `${hRec}%` }}
                    title={`Recebido em ${ponto.mes}: ${formatCurrencyBRL(ponto.recebido)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {dados.map((ponto) => (
            <span
              key={ponto.mes}
              className="flex-1 text-center text-xs font-medium text-[#54665C] dark:text-[#96ACA0]"
            >
              {ponto.mes}
            </span>
          ))}
        </div>
      </div>
    </DataState>
  );
}
