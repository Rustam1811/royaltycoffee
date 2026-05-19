import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(() => {
  const isCapacitor = process.env.CAPACITOR_BUILD === 'true';
  return {
    base: isCapacitor ? './' : '/app/',
    plugins: [
      react(),
      // PWA: используем ручной public/sw.js и public/manifest.json
      // VitePWA отключён - конфликтует с ручным SW
    ],
    // Vite автоматически подхватывает VITE_* переменные из .env файлов
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
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
          target: 'https://us-central1-royal-coffee-b1ce9.cloudfunctions.net',
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
    },
    build: {
      outDir: "dist/app",
      emptyOutDir: true,
      // Disable default publicDir copy — we handle it via scripts/copy-public.mjs
      // This prevents Vite from copying public/landing/node_modules (118 MB!) into dist
      copyPublicDir: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            'ui-vendor': ['framer-motion', '@heroicons/react'],
            'i18n': ['i18next', 'react-i18next'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2015',
    },
    // Production: удаляем console.log и debugger (disabled during Capacitor debugging)
    esbuild: {
      drop: process.env.NODE_ENV === 'production' && process.env.CAPACITOR_BUILD !== 'true' ? ['console', 'debugger'] : [],
    },
    // Оптимизация dev сервера
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        'i18next',
        'react-i18next',
      ],
      exclude: ['@firebase/auth', '@firebase/firestore'],
    },
  };
});
