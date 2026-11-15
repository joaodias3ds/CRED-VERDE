export const motion = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    shimmer: 1400,
    boot: 1600,
    reducedFade: 150,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    entrar: 'cubic-bezier(0, 0, 0.2, 1)',
    sair: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  boot: {
    tempoMinimoMs: 900,
    avisoLentoMs: 8000,
    limiteErroMs: 20000,
    tentativasAutomaticas: 3,
    backoffMs: [2000, 4000, 8000] as const,
    inatividadeResetMs: 30 * 60 * 1000, // 30 minutos em segundo plano
  },
} as const;

export const colors = {
  primary: {
    600: '#0F9D58',
    700: '#0B7A45',
    900: '#0B1F17',
  },
  gold: '#D4A017',
  skeleton: {
    light: '#E5EAE7',
    dark: '#1B2E25',
  },
} as const;

export function getPrefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion')) {
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}
