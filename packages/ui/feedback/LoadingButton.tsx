import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { generateIdempotencyKey } from '../../api-client/finance';
import { strings } from '../strings';
import { useToast } from './ToastProvider';

export interface LoadingButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onAction: (idempotencyKey: string) => Promise<void>;
  loadingLabel?: string;
  successToastMessage?: string;
  errorToastMessage?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function LoadingButton({
  onAction,
  loadingLabel = strings.acao.salvando,
  successToastMessage,
  errorToastMessage = 'Não foi possível concluir a operação.',
  variant = 'primary',
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: LoadingButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success'>('idle');
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey('btn'));
  const inFlightRef = useRef(false);
  const slowTimerRef = useRef<number | null>(null);
  const { mostrarToast } = useToast();

  useEffect(() => {
    return () => {
      if (slowTimerRef.current !== null) {
        window.clearTimeout(slowTimerRef.current);
      }
    };
  }, []);

  const execute = async () => {
    if (inFlightRef.current || disabled || phase === 'loading') return;
    inFlightRef.current = true;
    setPhase('loading');

    slowTimerRef.current = window.setTimeout(() => {
      mostrarToast({
        variante: 'aviso',
        mensagem: strings.offline.processandoLento,
      });
    }, 10000);

    try {
      await onAction(idempotencyKeyRef.current);
      if (slowTimerRef.current !== null) {
        window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }

      // Gera nova chave apenas após conclusão com sucesso
      idempotencyKeyRef.current = generateIdempotencyKey('btn');
      setPhase('success');

      if (successToastMessage) {
        mostrarToast({
          variante: 'sucesso',
          mensagem: successToastMessage,
        });
      }

      window.setTimeout(() => {
        setPhase('idle');
        inFlightRef.current = false;
      }, 600);
    } catch {
      if (slowTimerRef.current !== null) {
        window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setPhase('idle');
      inFlightRef.current = false;
      // Mantém a mesma idempotencyKey para o "Tentar novamente" não duplicar a ação financeira
      mostrarToast({
        variante: 'erro',
        mensagem: errorToastMessage,
        acaoLabel: strings.acao.tentarNovamente,
        onAcao: () => {
          void execute();
        },
      });
    }
  };

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#0B7A45] text-white hover:bg-[#096438] disabled:bg-[#0B7A45]/50'
      : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50'
        : 'border border-[#CBD7D0] bg-white text-[#111C16] hover:bg-[#F3F7F5] dark:border-[#243D31] dark:bg-[#13261D] dark:text-[#ECF3EE] dark:hover:bg-[#1A3327]';

  const isDisabled = Boolean(disabled) || phase === 'loading';

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={phase === 'loading'}
      onClick={() => {
        void execute();
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F9D58] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 ${variantClasses} ${className}`}
      {...rest}
    >
      {phase === 'loading' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{loadingLabel}</span>
        </>
      )}
      {phase === 'success' && (
        <>
          <Check className="h-4 w-4" aria-hidden="true" />
          <span>Concluído</span>
        </>
      )}
      {phase === 'idle' && children}
    </button>
  );
}
