import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: '/landing/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    exclude: ['firebase/firestore', 'firebase/auth']
  },
  css: {
    devSourcemap: true
  },
  build: {
    target: 'esnext',
    outDir: '../../dist/landing',
    emptyOutDir: true
  }
});

