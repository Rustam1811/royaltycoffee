import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',        // важно: относительные ассеты => /admin/assets/... через прокси
  build: {
    outDir: 'dist',  // билд в локальную папку проекта
    emptyOutDir: true,
  },
})
