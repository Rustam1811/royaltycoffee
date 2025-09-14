import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      react()
    ],
    base: '/',
    define: {
      'import.meta.env': env
    },
    resolve: {
      dedupe: ['swiper'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@features': path.resolve(__dirname, 'src/features'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@theme': path.resolve(__dirname, 'src/theme'),
        '@contexts': path.resolve(__dirname, 'src/contexts')
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (p) => p, // keep path as-is, e.g., /api/promo
          ws: false
        },
        '/firebase-api': {
          target: 'https://us-central1-coffeeaddict-c9d70.cloudfunctions.net',
          changeOrigin: true,
          secure: true,
          ws: false,
          rewrite: (path) => path.replace(/^\/firebase-api/, ''),
          configure: (proxy, options) => {
            proxy.on('error', (err) => {
              console.error('Firebase proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('🔄 Proxying to Firebase:', req.method, req.url, '→', options.target + req.url.replace('/firebase-api', ''));
            });
          },
        },
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'credentialless'
      }
    }
  };
});
