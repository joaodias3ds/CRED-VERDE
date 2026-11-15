import { AlertTriangle, CheckCircle2, CloudOff, Wifi } from 'lucide-react';
import type { ConexaoEstado } from '../../api-client/useConexao';
import { strings } from '../strings';

export interface ConnectionBannerProps {
  estado: ConexaoEstado;
  pendingSyncCount?: number;
  onRecheck?: () => void;
}

export function ConnectionBanner({
  estado,
  pendingSyncCount = 0,
  onRecheck,
}: ConnectionBannerProps) {
  if (estado === 'online') {
    return null;
  }

  const config = {
    offline: {
      bg: 'bg-amber-500 text-amber-950 dark:bg-amber-500/95 dark:text-amber-950',
      Icon: CloudOff,
      texto:
        pendingSyncCount > 0
          ? `${strings.offline.bannerSemConexao} (${pendingSyncCount} ${pendingSyncCount === 1 ? 'ação na fila' : 'ações na fila'})`
          : strings.offline.bannerSemConexao,
    },
    lento: {
      bg: 'bg-slate-600 text-white dark:bg-slate-700 dark:text-slate-100',
      Icon: Wifi,
      texto: strings.offline.bannerLento,
    },
    restabelecida: {
      bg: 'bg-[#0F9D58] text-white',
      Icon: CheckCircle2,
      texto: strings.offline.bannerRestabelecida,
    },
    servidor_indisponivel: {
      bg: 'bg-red-600 text-white',
      Icon: AlertTriangle,
      texto: strings.offline.bannerServidor,
    },
  }[estado];

  const Icon = config.Icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${config.bg}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{config.texto}</span>
      {(estado === 'offline' || estado === 'servidor_indisponivel') && onRecheck && (
        <button
          type="button"
          onClick={onRecheck}
          className="ml-2 underline underline-offset-2 hover:opacity-80 whitespace-nowrap shrink-0"
        >
          {strings.acao.tentarNovamente}
        </button>
      )}
    </div>
  );
}
