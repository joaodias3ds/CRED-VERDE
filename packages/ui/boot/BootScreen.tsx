import { useEffect } from 'react';
import type { BootErrorKind, BootStage, BootStatus } from '../../api-client/types';
import { strings } from '../strings';
import { BootLogoAnimation } from './BootLogoAnimation';
import { BootProgress } from './BootProgress';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';

export interface BootScreenProps {
  etapa: BootStage;
  progresso: number;
  status: BootStatus;
  erro: BootErrorKind | null;
  podeUsarOffline: boolean;
  exiting?: boolean;
  onTentarNovamente: () => void;
  onUsarModoOffline: () => void;
}

export function BootScreen({
  etapa,
  progresso,
  status,
  erro,
  podeUsarOffline,
  exiting = false,
  onTentarNovamente,
  onUsarModoOffline,
}: BootScreenProps) {
  useEffect(() => {
    // Oculta a splash HTML/CSS nativa assim que o BootScreen está montado para animar (Seção 2)
    const splash = document.getElementById('native-splash');
    if (splash) {
      splash.classList.add('splash-hiding');
      const timer = window.setTimeout(() => {
        splash.remove();
      }, 240);
      return () => window.clearTimeout(timer);
    }
  }, []);

  if (status === 'erro') {
    return (
      <ConnectionErrorScreen
        erro={erro}
        podeUsarOffline={podeUsarOffline}
        onTentarNovamente={onTentarNovamente}
        onUsarModoOffline={onUsarModoOffline}
      />
    );
  }

  return (
    <div
      data-testid="boot-screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#0B7A45] to-[#0F9D58] px-6 py-10 text-white transition-opacity duration-400 motion-reduce:duration-150 dark:from-[#0B1F17] dark:to-[#0B7A45] ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div aria-hidden="true" className="h-6" />

      <div className="flex w-full max-w-xs flex-col items-center">
        <BootLogoAnimation progresso={progresso} exiting={exiting} />
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-white">
          {strings.app.nome}
        </h1>
        <BootProgress etapa={etapa} progresso={progresso} status={status} />
      </div>

      <footer className="flex items-center gap-2 text-xs text-white/75">
        <span>{strings.app.lema}</span>
        <span aria-hidden="true">·</span>
        <span>{strings.app.versao}</span>
      </footer>
    </div>
  );
}
