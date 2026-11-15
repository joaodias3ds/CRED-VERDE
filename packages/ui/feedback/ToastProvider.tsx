import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'sucesso' | 'erro' | 'aviso';

export interface ToastItem {
  id: string;
  mensagem: string;
  variante: ToastVariant;
  acaoLabel?: string;
  onAcao?: () => void;
}

interface ToastContextValue {
  mostrarToast: (toast: Omit<ToastItem, 'id'>) => string;
  removerToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removerToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const mostrarToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);

      const duration = toast.variante === 'erro' ? 6000 : 4000;
      window.setTimeout(() => {
        removerToast(id);
      }, duration);

      return id;
    },
    [removerToast],
  );

  return (
    <ToastContext.Provider value={{ mostrarToast, removerToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => {
          const styles =
            toast.variante === 'sucesso'
              ? 'border-[#0F9D58]/30 bg-white text-[#111C16] dark:bg-[#11221A] dark:text-[#ECF3EE] dark:border-[#0F9D58]/40'
              : toast.variante === 'erro'
                ? 'border-red-500/30 bg-white text-[#111C16] dark:bg-[#231416] dark:text-red-50 dark:border-red-500/40'
                : 'border-amber-500/30 bg-white text-[#111C16] dark:bg-[#221D12] dark:text-amber-50 dark:border-amber-500/40';

          const Icon =
            toast.variante === 'sucesso'
              ? CheckCircle2
              : toast.variante === 'erro'
                ? AlertCircle
                : Info;

          const iconColor =
            toast.variante === 'sucesso'
              ? 'text-[#0F9D58]'
              : toast.variante === 'erro'
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400';

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg transition-all duration-200 ${styles}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium leading-snug">{toast.mensagem}</p>
                {toast.acaoLabel && toast.onAcao && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onAcao?.();
                      removerToast(toast.id);
                    }}
                    className="mt-1.5 text-xs font-semibold text-[#0B7A45] hover:underline dark:text-[#34D399]"
                  >
                    {toast.acaoLabel}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removerToast(toast.id)}
                aria-label="Fechar aviso"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      mostrarToast: () => '',
      removerToast: () => undefined,
    };
  }
  return ctx;
}
