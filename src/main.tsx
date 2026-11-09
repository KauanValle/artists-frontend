import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from './routes'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider, initTheme } from '@/hooks/useTheme'
import './index.css'
import {WhatsAppSupportButton} from "@/components/WhatsAppSupportButton.tsx";
import {InstallAppButton} from "@/components/InstallAppButton.tsx";
import {PushPermissionModal} from "@/components/PushPermissionModal.tsx";

// Registra o service worker do PWA (vite-plugin-pwa strategy "injectManifest").
// Sem isso, notificações push e cache offline não funcionam.
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})

initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
            <WhatsAppSupportButton />
            <InstallAppButton/>
          <PushPermissionModal />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
