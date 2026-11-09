// Service worker do PWA (vite-plugin-pwa · strategy "injectManifest").
// Cuida de: cache do app (precache), fallback de navegação (SPA) e notificações Web Push.
// Este arquivo roda no contexto de Service Worker (sem lib "webworker" no tsconfig do app),
// por isso os tipos usados abaixo são declarados localmente.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

interface PushPayload {
  title?: string
  message?: string
  link?: string
}

interface SwClient {
  url: string
  focus: () => Promise<unknown>
  navigate?: (url: string) => Promise<unknown>
  postMessage: (message: unknown) => void
}

interface SwEvent extends Event {
  waitUntil: (promise: Promise<unknown>) => void
}

interface SwPushEvent extends SwEvent {
  data: { json: () => PushPayload; text: () => string } | null
}

interface SwNotificationClickEvent extends SwEvent {
  notification: { close: () => void; data?: { link?: string } }
}

interface SwScope {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
  location: Location
  registration: {
    showNotification: (title: string, options?: Record<string, unknown>) => Promise<void>
  }
  clients: {
    matchAll: (options: { type: 'window'; includeUncontrolled: boolean }) => Promise<SwClient[]>
    openWindow: (url: string) => Promise<unknown>
  }
  skipWaiting: () => Promise<void>
  addEventListener: (type: string, listener: (event: never) => void) => void
}

declare const self: SwScope

// ── Ciclo de vida / cache ─────────────────────────────────────────────
void self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Em produção toda navegação cai no index.html (SPA); API e uploads nunca passam pelo fallback.
// No modo dev o index.html não está no precache, então a rota só é registrada no build.
if (!import.meta.env.DEV) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//, /^\/uploads\//],
    }),
  )
}

// ── Web Push ──────────────────────────────────────────────────────────
// Payload enviado pelo backend (PushNotificationSender): { title, message, link }.
self.addEventListener('push', ((event: SwPushEvent) => {
  const payload: PushPayload = { title: 'Reprissa', message: '', link: '/' }
  try {
    if (event.data) Object.assign(payload, event.data.json())
  } catch {
    const text = event.data?.text()
    if (text) payload.message = text
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(payload.title || 'Reprissa', {
        body: payload.message ?? '',
        icon: '/pwa_192x192.png',
        badge: '/pwa_192x192.png',
        data: { link: payload.link || '/' },
        // tag + renotify: cada push gera um pop-up mesmo se já houver notificação anterior.
        tag: 'reprissa-' + Date.now(),
        renotify: true,
        // Vibração para chamar atenção no Android (padrão: vibra-pausa-vibra).
        vibrate: [200, 100, 200],
        // Mantém a notificação na tela até o usuário interagir.
        requireInteraction: true,
      } as Record<string, unknown>)

      // Se o app estiver aberto, avisa para atualizar o sininho na hora.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      windows.forEach((client) => client.postMessage({ type: 'push-received' }))
    })(),
  )
}) as (event: never) => void)

self.addEventListener('notificationclick', ((event: SwNotificationClickEvent) => {
  event.notification.close()

  // Só aceita links do próprio site (evita abrir domínio externo vindo do payload).
  const origin = self.location.origin
  let target = new URL('/', origin).href
  try {
    const url = new URL(event.notification.data?.link || '/', origin)
    if (url.origin === origin) target = url.href
  } catch {
    // mantém a home
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((client) => client.url.startsWith(origin))
      if (existing) {
        try {
          if (existing.navigate) await existing.navigate(target)
          await existing.focus()
          return
        } catch {
          // cai para abrir uma nova janela
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
}) as (event: never) => void)
