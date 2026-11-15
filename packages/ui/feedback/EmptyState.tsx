import React from 'react';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  acaoLabel?: string;
  onAcao?: () => void;
  icone?: React.ReactNode;
}

export function EmptyState({
  titulo,
  descricao,
  acaoLabel,
  onAcao,
  icone,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD7D0] bg-white/70 px-6 py-12 text-center dark:border-[#243D31] dark:bg-[#0F1E17]/60">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EDF5F0] text-[#0B7A45] dark:bg-[#173024] dark:text-[#34D399]">
        {icone ?? <FolderOpen className="h-6 w-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-[#111C16] dark:text-[#ECF3EE]">
        {titulo}
      </h3>
      {descricao && (
        <p className="mt-1 max-w-sm text-sm text-[#54665C] dark:text-[#96ACA0]">
          {descricao}
        </p>
      )}
      {acaoLabel && onAcao && (
        <button
          type="button"
          onClick={onAcao}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#0B7A45] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#096438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F9D58] whitespace-nowrap shrink-0"
        >
          {acaoLabel}
        </button>
      )}
    </div>
  );
}
