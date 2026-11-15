import { Skeleton, SkeletonText } from '@emprestimo/ui';
import { formatDateBR, type TimelineEvent } from '@emprestimo/api-client';

export interface TimelineProps {
  eventos?: TimelineEvent[];
  loading?: boolean;
}

export function Timeline({ eventos = [], loading = false }: TimelineProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-5 py-2" aria-busy="true">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex gap-3.5">
            <Skeleton width={12} height={12} rounded="full" className="mt-1 shrink-0" />
            <div className="flex-1">
              <SkeletonText lines={2} widths={['55%', '85%']} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <p className="py-4 text-sm text-[#64786D] dark:text-[#869D90]">
        Nenhum evento registrado até o momento.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-[#DCE3DF] pl-5 dark:border-[#1E3329]">
      {eventos.map((ev) => (
        <li key={ev.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0F9D58] dark:border-[#0F1E17]"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[#111C16] dark:text-[#ECF3EE]">
              {ev.titulo}
            </p>
            <time className="font-mono text-xs text-[#64786D] dark:text-[#869D90]">
              {formatDateBR(ev.dataIso)}
            </time>
          </div>
          <p className="mt-0.5 text-sm text-[#54665C] dark:text-[#96ACA0]">
            {ev.descricao}
          </p>
        </li>
      ))}
    </ol>
  );
}
