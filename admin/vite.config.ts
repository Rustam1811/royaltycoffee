import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  envDir: "../", // Read .env from parent directory
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5001/royal-coffee-b1ce9/us-central1/app',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    outDir: "../dist/admin",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}[extname]`
      }
    }
  },
});
