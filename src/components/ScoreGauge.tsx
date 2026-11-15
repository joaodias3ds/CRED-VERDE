import { Skeleton } from '@emprestimo/ui';

export interface ScoreGaugeProps {
  score?: number;
  loading?: boolean;
}

export function ScoreGauge({ score = 0, loading = false }: ScoreGaugeProps) {
  const radius = 44;
  const circumference = Math.PI * radius; // semicírculo
  const pct = Math.max(0, Math.min(1000, score)) / 1000;
  const dashOffset = circumference * (1 - pct);

  const label =
    score >= 800
      ? 'Excelente'
      : score >= 650
        ? 'Bom'
        : score >= 500
          ? 'Regular'
          : 'Atenção';

  const strokeColor =
    score >= 800
      ? '#0F9D58'
      : score >= 650
        ? '#16A34A'
        : score >= 500
          ? '#D97706'
          : '#DC2626';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]" aria-busy="true">
        <div className="relative flex h-24 w-28 items-center justify-center">
          <svg viewBox="0 0 110 110" className="cv-ring-animate h-20 w-20" aria-hidden="true">
            <circle
              cx="55"
              cy="55"
              r="40"
              fill="none"
              stroke="#D5DDD8"
              strokeWidth="8"
              strokeDasharray="160 90"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <Skeleton width={64} height={24} rounded="sm" className="mt-1" />
        <Skeleton width={88} height={12} rounded="sm" className="mt-2" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-[#DCE3DF] bg-white p-6 dark:border-[#1E3329] dark:bg-[#0F1E17]">
      <span className="text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
        Score de crédito
      </span>
      <div className="relative mt-3 flex flex-col items-center">
        <svg viewBox="0 0 110 66" className="h-24 w-36" aria-hidden="true">
          <path
            d="M 11 55 A 44 44 0 0 1 99 55"
            fill="none"
            stroke="#E5EAE7"
            className="dark:stroke-[#1B2E25]"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 11 55 A 44 44 0 0 1 99 55"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="-mt-7 font-mono text-3xl font-bold tabular-nums text-[#111C16] dark:text-[#ECF3EE]">
          {score}
        </span>
      </div>
      <span className="mt-2 text-xs font-semibold" style={{ color: strokeColor }}>
        {label} · de 1000
      </span>
      <p className="mt-3 text-center text-xs text-[#64786D] dark:text-[#869D90]">
        Baseado no histórico de pontualidade e comprometimento de renda.
      </p>
    </div>
  );
}
