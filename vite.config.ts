import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
  plugins: [react(),
            VitePWA({
              registerType: 'autoUpdate',
                devOptions: {
                    enabled: true
                },
              manifest: {
                  name: 'Reprissa',
                  short_name: 'Reprissa',
                  description: 'Gestão de carreira e contratação de artistas.',
                  theme_color: '#6C35A5',
                  background_color: '#090909',
                  display: 'standalone',
                  orientation: 'portrait',
                  icons: [
                      {
                          src: '/pwa_192x192.png',
                          sizes: '192x192',
                          type: 'image/png'
                      },
                      {
                          src: '/pwa_512x512.png',
                          sizes: '512x512',
                          type: 'image/png'
                      },
                      {
                          src: '/pwa_512x512.png',
                          sizes: '512x512',
                          type: 'image/png',
                          purpose: 'any maskable'
                      }
                  ]
              }
      })],
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
    headers: {
      // 'Cross-Origin-Opener-Policy': 'same-origin',
      // 'Cross-Origin-Embedder-Policy': 'require-corp',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'interest-cohort=()'
    },
  },
})
