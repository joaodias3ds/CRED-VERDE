import { Skeleton } from './Skeleton';

export function SkeletonStatCard({ titulo }: { titulo?: string }) {
  return (
    <div
      aria-busy="true"
      className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]"
    >
      <div className="flex items-center justify-between gap-3">
        {titulo ? (
          <span className="text-sm font-medium text-[#54665C] dark:text-[#96ACA0]">{titulo}</span>
        ) : (
          <Skeleton width="55%" height={14} rounded="sm" />
        )}
        <Skeleton width={32} height={32} rounded="lg" className="shrink-0" />
      </div>
      <div className="mt-3">
        {/* Barra curta com o formato de valor monetário R$ — evita layout shift */}
        <Skeleton width={136} height={30} rounded="md" />
      </div>
      <div className="mt-2">
        <Skeleton width="48%" height={12} rounded="sm" />
      </div>
    </div>
  );
}

export function SkeletonChartCard({ titulo }: { titulo?: string }) {
  const barHeights = ['42%', '68%', '54%', '82%', '62%', '90%'];

  return (
    <div
      aria-busy="true"
      className="rounded-xl border border-[#DCE3DF] bg-white p-5 dark:border-[#1E3329] dark:bg-[#0F1E17]"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        {titulo ? (
          <h3 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">{titulo}</h3>
        ) : (
          <Skeleton width={180} height={18} rounded="sm" />
        )}
        <Skeleton width={96} height={24} rounded="md" />
      </div>

      {/* Moldura do gráfico com barras fantasma + eixo em skeleton */}
      <div className="flex h-52 items-end gap-3 border-b border-[#E5EAE7] pb-3 dark:border-[#1E3329]">
        {barHeights.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2 h-full">
            <div className="flex w-full items-end justify-center gap-1.5 h-full">
              <Skeleton width="42%" height={h} rounded="sm" />
              <Skeleton width="42%" height={`${Math.max(25, parseInt(h, 10) - 14)}%`} rounded="sm" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {barHeights.map((_, i) => (
          <Skeleton key={i} width={34} height={10} rounded="sm" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonLoanOrCustomerCard() {
  return (
    <div
      aria-busy="true"
      className="flex items-center justify-between gap-4 rounded-xl border border-[#DCE3DF] bg-white p-4 dark:border-[#1E3329] dark:bg-[#0F1E17]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <Skeleton width={42} height={42} rounded="full" className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton width="62%" height={14} rounded="sm" />
          <Skeleton width="80%" height={11} rounded="sm" />
          <Skeleton width="45%" height={11} rounded="sm" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <Skeleton width={88} height={16} rounded="sm" />
        <Skeleton width={68} height={20} rounded="md" />
      </div>
    </div>
  );
}
