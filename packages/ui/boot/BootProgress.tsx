import type { BootStage, BootStatus } from '../../api-client/types';
import { strings } from '../strings';

export interface BootProgressProps {
  etapa: BootStage;
  progresso: number;
  status: BootStatus;
}

const stageLabels: Record<BootStage, string> = {
  iniciando: strings.boot.iniciando,
  conexao: strings.boot.conexao,
  banco: strings.boot.banco,
  sessao: strings.boot.sessao,
  dados: strings.boot.dados,
  pronto: strings.boot.pronto,
};

export function BootProgress({ etapa, progresso, status }: BootProgressProps) {
  const clamped = Math.max(0, Math.min(100, progresso));
  const label = stageLabels[etapa] ?? strings.boot.iniciando;

  return (
    <div className="mt-6 flex w-full max-w-[260px] flex-col items-center">
      {/* Barra fina de 4px com cantos arredondados */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label}
        className="h-1 w-full overflow-hidden rounded-full bg-white/25"
      >
        <div
          className="h-full rounded-full bg-white transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${clamped}%` }}
        />
      </div>

      <p className="mt-3 text-center text-sm font-medium text-white/95" aria-live="polite">
        {label}
      </p>

      {status === 'lento' && (
        <p className="mt-1.5 text-center text-xs text-white/80" aria-live="polite">
          {strings.boot.lento}
        </p>
      )}
    </div>
  );
}
