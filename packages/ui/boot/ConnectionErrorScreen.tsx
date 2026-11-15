import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import type { BootErrorKind } from '../../api-client/types';
import { strings } from '../strings';

export interface ConnectionErrorScreenProps {
  erro: BootErrorKind | null;
  podeUsarOffline: boolean;
  onTentarNovamente: () => void;
  onUsarModoOffline: () => void;
}

export function ConnectionErrorScreen({
  erro,
  podeUsarOffline,
  onTentarNovamente,
  onUsarModoOffline,
}: ConnectionErrorScreenProps) {
  const isOffline = erro === 'sem_conexao';
  const Icon = isOffline ? WifiOff : CloudOff;
  const descricao = isOffline ? strings.erro.semConexao : strings.erro.servidor;

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#0B7A45] to-[#0F9D58] px-6 text-white dark:from-[#0B1F17] dark:to-[#0B7A45]"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/20 p-7 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          {strings.erro.tituloConexao}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          {descricao}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onTentarNovamente}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#0B7A45] transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>{strings.acao.tentarNovamente}</span>
          </button>

          {podeUsarOffline && (
            <button
              type="button"
              onClick={onUsarModoOffline}
              className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-transparent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
            >
              {strings.acao.usarModoOffline}
            </button>
          )}
        </div>
      </div>

      <p className="mt-8 text-xs text-white/70">
        {strings.app.lema} · {strings.app.versao}
      </p>
    </div>
  );
}
