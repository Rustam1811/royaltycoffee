import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isCapacitor = process.env.CAPACITOR_BUILD === 'true';

export default defineConfig({
  plugins: [react()],
  // In Capacitor builds use relative paths so assets load from file:// or capacitor://
  base: isCapacitor ? './' : '/workshop/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist/workshop',
    emptyOutDir: true,
  },
});
