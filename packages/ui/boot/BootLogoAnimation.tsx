import { colors } from '../../config/motion';

export interface BootLogoAnimationProps {
  progresso: number;
  exiting?: boolean;
}

/**
 * Versão em SVG animado da moeda dourada (#D4A017) com ciclo de 1.6s
 * e barra interna de preenchimento vinculada ao progresso real do boot.
 * Pode ser substituída futuramente por arquivo Lottie sem alterar a API.
 */
export function BootLogoAnimation({
  progresso,
  exiting = false,
}: BootLogoAnimationProps) {
  const clamped = Math.max(0, Math.min(100, progresso));

  return (
    <div
      className={`relative flex h-24 w-24 items-center justify-center transition-all duration-400 motion-reduce:transition-opacity ${
        exiting ? 'scale-75 -translate-y-4 opacity-0' : 'scale-100 translate-y-0 opacity-100'
      }`}
    >
      {/* Halo externo discreto */}
      <div
        className="absolute inset-0 rounded-full border-2 border-white/25"
        aria-hidden="true"
      />

      {/* Moeda dourada giratória (1.6s loop, parada em reduzir-movimento) */}
      <div className="cv-coin-animate flex h-20 w-20 items-center justify-center rounded-full shadow-lg">
        <svg
          viewBox="0 0 80 80"
          className="h-20 w-20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cvCoinGrad" x1="12" y1="8" x2="68" y2="72" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F0C445" />
              <stop offset="55%" stopColor={colors.gold} />
              <stop offset="100%" stopColor="#A67A0A" />
            </linearGradient>
            <clipPath id="cvFillClip">
              <rect
                x="0"
                y={80 - (80 * clamped) / 100}
                width="80"
                height={(80 * clamped) / 100}
              />
            </clipPath>
          </defs>

          {/* Base da moeda */}
          <circle cx="40" cy="40" r="36" fill="url(#cvCoinGrad)" stroke="#FFF3C4" strokeWidth="2.5" />
          <circle cx="40" cy="40" r="29" stroke="#7A5703" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Cifrão de base translúcido */}
          <path
            d="M40 20V60M48 28.5C48 25.3 44.5 23.2 40 23.2C35.5 23.2 32 25.6 32 28.9C32 32.8 36.1 34.7 40.3 35.9C44.8 37.1 48.5 39.2 48.5 43.5C48.5 47.4 44.6 50.3 40 50.3C35.1 50.3 31.5 47.7 31.5 43.8"
            stroke="#593F00"
            strokeOpacity="0.35"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cifrão branco que preenche conforme progresso real */}
          <g clipPath="url(#cvFillClip)">
            <path
              d="M40 20V60M48 28.5C48 25.3 44.5 23.2 40 23.2C35.5 23.2 32 25.6 32 28.9C32 32.8 36.1 34.7 40.3 35.9C44.8 37.1 48.5 39.2 48.5 43.5C48.5 47.4 44.6 50.3 40 50.3C35.1 50.3 31.5 47.7 31.5 43.8"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
