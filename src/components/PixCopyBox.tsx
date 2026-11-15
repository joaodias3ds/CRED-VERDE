import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Skeleton, strings, useToast } from '@emprestimo/ui';

export interface PixCopyBoxProps {
  chavePix?: string;
  loading?: boolean;
  titulo?: string;
}

export function PixCopyBox({
  chavePix,
  loading = false,
  titulo = 'Chave PIX para recebimento',
}: PixCopyBoxProps) {
  const [copiado, setCopiado] = useState(false);
  const { mostrarToast } = useToast();

  const handleCopy = async () => {
    if (!chavePix || loading) return;
    try {
      await navigator.clipboard.writeText(chavePix);
      setCopiado(true);
      mostrarToast({
        variante: 'sucesso',
        mensagem: 'Chave PIX copiada para a área de transferência.',
      });
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      mostrarToast({
        variante: 'aviso',
        mensagem: 'Selecione e copie a chave PIX manualmente.',
      });
    }
  };

  return (
    <div className="rounded-xl border border-[#DCE3DF] bg-white p-4 dark:border-[#1E3329] dark:bg-[#0F1E17]">
      <p className="text-xs font-medium text-[#54665C] dark:text-[#96ACA0]">
        {titulo}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        {loading ? (
          <Skeleton height={38} className="flex-1" rounded="lg" />
        ) : (
          <div className="min-w-0 flex-1 truncate rounded-lg border border-[#DCE3DF] bg-[#F7FAF8] px-3 py-2 font-mono text-xs text-[#111C16] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE]">
            {chavePix}
          </div>
        )}
        <button
          type="button"
          disabled={loading || !chavePix}
          onClick={() => void handleCopy()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#CBD7D0] bg-white px-3.5 py-2 text-xs font-semibold text-[#111C16] transition-colors hover:bg-[#F3F7F5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE] dark:hover:bg-[#1A3327] whitespace-nowrap shrink-0"
        >
          {copiado ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#0F9D58]" aria-hidden="true" />
              <span>{strings.acao.copiado}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{strings.acao.copiar}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
