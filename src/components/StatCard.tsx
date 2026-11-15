import React, { useId } from 'react';
import { DataState, SkeletonStatCard, type DataViewStatus } from '@emprestimo/ui';

export interface StatCardProps {
  titulo: string;
  valorFormatado?: string;
  subtitulo?: string;
  icone: React.ReactNode;
  status: DataViewStatus;
  onTentarNovamente?: () => void;
  destaque?: 'padrao' | 'positivo' | 'atencao';
  microGrafico?: 'none' | 'bars' | 'sparkline' | 'progress';
  progressoPct?: number;
  serie?: number[];
}

export function StatCard({
  titulo,
  valorFormatado,
  subtitulo,
  icone,
  status,
  onTentarNovamente,
  destaque = 'padrao',
  microGrafico = 'none',
  progressoPct = 82,
  serie = [38, 52, 46, 68, 62, 85],
}: StatCardProps) {
  const sparkId = useId();
  const accentColor =
    destaque === 'positivo'
      ? 'text-[#0B7A45] dark:text-[#34D399]'
      : destaque === 'atencao'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-[#111C16] dark:text-[#ECF3EE]';

  const maxSerie = Math.max(1, ...serie);

  return (
    <DataState
      status={status}
      skeleton={<SkeletonStatCard titulo={titulo} />}
      vazio={<SkeletonStatCard titulo={titulo} />}
      onTentarNovamente={onTentarNovamente}
    >
      <div className="flex h-full flex-col justify-between rounded-2xl border border-[#DCE3DF] bg-white p-5 transition-colors dark:border-[#192D23] dark:bg-[#0D1A14]">
        <div>
          <div className="flex items-start justify-between gap-2.5">
            <span className="text-[13px] font-medium leading-snug text-[#54665C] dark:text-[#96ACA0]">
              {titulo}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EDF5F0] text-[#0B7A45] dark:bg-[#173024] dark:text-[#34D399]">
              {icone}
            </div>
          </div>

          <p className={`mt-3 font-mono text-2xl font-semibold tracking-tight tabular-nums ${accentColor}`}>
            {valorFormatado}
          </p>

          {subtitulo && (
            <p className="mt-1 text-xs text-[#64786D] dark:text-[#869D90] truncate">
              {subtitulo}
            </p>
          )}
        </div>

        {microGrafico === 'bars' && (
          <div className="mt-4 flex h-10 items-end gap-1.5" aria-hidden="true">
            {serie.map((val, idx) => {
              const hPct = Math.max(20, Math.round((val / maxSerie) * 100));
              const isLast = idx === serie.length - 1;
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-sm ${
                    isLast
                      ? 'bg-[#0F9D58]'
                      : 'bg-[#DCE7E1] dark:bg-[#1D3529]'
                  }`}
                  style={{ height: `${hPct}%` }}
                />
              );
            })}
          </div>
        )}

        {microGrafico === 'sparkline' && (
          <div className="mt-4 h-10 w-full" aria-hidden="true">
            <svg viewBox="0 0 180 40" className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id={sparkId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F9D58" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#0F9D58" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 2 32 C 28 28, 48 16, 74 22 C 102 28, 128 8, 178 6 L 178 39 L 2 39 Z"
                fill={`url(#${sparkId})`}
              />
              <path
                d="M 2 32 C 28 28, 48 16, 74 22 C 102 28, 128 8, 178 6"
                fill="none"
                stroke="#0F9D58"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="178" cy="6" r="3" fill="#0F9D58" />
            </svg>
          </div>
        )}

        {microGrafico === 'progress' && (
          <div className="mt-4 space-y-1.5" aria-hidden="true">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EAE7] dark:bg-[#1B2E25]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0B7A45] to-[#22C55E]"
                style={{ width: `${Math.min(100, Math.max(8, progressoPct))}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[11px] text-[#64786D] dark:text-[#869D90]">
              <span>Em dia</span>
              <span>{progressoPct}%</span>
            </div>
          </div>
        )}
      </div>
    </DataState>
  );
}
