import React, { useEffect, useRef, useState } from 'react';
import { motion } from '../../config/motion';
import { useAppBoot, type UseAppBootResult } from '../../api-client/useAppBoot';
import { BootScreen } from './BootScreen';

export interface BootGateProps {
  skipBoot?: boolean;
  children: (boot: UseAppBootResult) => React.ReactNode;
}

export function BootGate({ skipBoot = false, children }: BootGateProps) {
  const boot = useAppBoot({ skipMinDuration: skipBoot });
  const [exiting, setExiting] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(skipBoot);
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (skipBoot) {
      const splash = document.getElementById('native-splash');
      if (splash) splash.remove();
      setGateUnlocked(true);
      return;
    }

    if (boot.status === 'pronto' && !gateUnlocked) {
      setExiting(true);
      const timer = window.setTimeout(() => {
        setGateUnlocked(true);
        setExiting(false);
      }, motion.duration.slow);
      return () => window.clearTimeout(timer);
    }
  }, [boot.status, gateUnlocked, skipBoot]);

  // Seção 4: só repete a animação se o app ficar > 30 min em segundo plano com sessão expirada
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const awayMs = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (awayMs > motion.boot.inatividadeResetMs && boot.sessaoExpirada) {
          setGateUnlocked(false);
          boot.tentarNovamente();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [boot]);

  return (
    <>
      {gateUnlocked && (
        <div className="animate-[fadeSlideUp_400ms_cubic-bezier(0.4,0,0.2,1)] motion-reduce:animate-none">
          {children(boot)}
        </div>
      )}
      {!gateUnlocked && (
        <BootScreen
          etapa={boot.etapa}
          progresso={boot.progresso}
          status={boot.status}
          erro={boot.erro}
          podeUsarOffline={boot.podeUsarOffline}
          exiting={exiting}
          onTentarNovamente={boot.tentarNovamente}
          onUsarModoOffline={boot.usarModoOffline}
        />
      )}
    </>
  );
}
