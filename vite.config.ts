import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@emprestimo/config': path.resolve(__dirname, 'packages/config/motion.ts'),
        '@emprestimo/ui': path.resolve(__dirname, 'packages/ui/index.ts'),
        '@emprestimo/api-client': path.resolve(__dirname, 'packages/api-client/index.ts'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./packages/ui/__tests__/setup.ts'],
      include: ['packages/ui/__tests__/**/*.test.{ts,tsx}'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
