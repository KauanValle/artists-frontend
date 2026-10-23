import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Alvo SEM sufixo de caminho: o path da requisição é anexado ao target.
      // Com sufixo '/api' o pedido viraria /api/api/... (e /uploads viraria /api/uploads).
      '/api': {
        target: 'https://artists-backend-production.up.railway.app',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://artists-backend-production.up.railway.app',
        changeOrigin: true,
      },
    },
  },
})
