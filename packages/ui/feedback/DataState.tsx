import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { strings } from '../strings';

export type DataViewStatus = 'carregando' | 'sucesso' | 'vazio' | 'erro';

export interface DataStateProps {
  status: DataViewStatus;
  skeleton: React.ReactNode;
  vazio: React.ReactNode;
  erro?: React.ReactNode;
  onTentarNovamente?: () => void;
  mensagemErro?: string;
  children: React.ReactNode;
}

export function DataState({
  status,
  skeleton,
  vazio,
  erro,
  onTentarNovamente,
  mensagemErro = strings.erro.carregar,
  children,
}: DataStateProps) {
  if (status === 'carregando') {
    return <>{skeleton}</>;
  }

  if (status === 'erro') {
    if (erro) return <>{erro}</>;
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/70 px-6 py-8 text-center dark:border-red-900/50 dark:bg-red-950/20"
      >
        <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-[#111C16] dark:text-red-100">
          {mensagemErro}
        </p>
        {onTentarNovamente && (
          <button
            type="button"
            onClick={onTentarNovamente}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 dark:border-red-800 dark:bg-[#1B1214] dark:text-red-300 dark:hover:bg-red-950/50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{strings.acao.tentarNovamente}</span>
          </button>
        )}
      </div>
    );
  }

  if (status === 'vazio') {
    return <>{vazio}</>;
  }

  return (
    <div className="animate-[fadeIn_200ms_cubic-bezier(0.4,0,0.2,1)_forwards] motion-reduce:animate-none">
      {children}
    </div>
  );
}
