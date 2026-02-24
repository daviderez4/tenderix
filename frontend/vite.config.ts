import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5174,
    allowedHosts: ['localhost', '.trycloudflare.com'],
    proxy: {
      '/api/webhook': {
        target: 'https://daviderez.app.n8n.cloud/webhook',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/webhook/, ''),
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
  },
})
