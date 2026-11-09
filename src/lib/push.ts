import axios from 'axios'
import { API_BASE, loadSession } from '@/services/api'
import { pushApi } from '@/services'

/** Navegador com suporte a Web Push (no iPhone só existe com o app instalado na tela inicial). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isIOSDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iOS só libera push para PWA instalado (Compartilhar → Adicionar à Tela de Início). */
export function needsInstallForPush(): boolean {
  return isIOSDevice() && !isStandalone()
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready
}

async function createSubscription(registration: ServiceWorkerRegistration): Promise<PushSubscription> {
  const { data: publicKey } = await pushApi.vapidPublicKey()
  if (!publicKey || typeof publicKey !== 'string') {
    throw new Error('Notificações push não configuradas no servidor.')
  }

  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  }

  try {
    return await registration.pushManager.subscribe(options)
  } catch (error) {
    // Inscrição antiga criada com outra chave VAPID: descarta e cria de novo.
    const existing = await registration.pushManager.getSubscription()
    if (!existing) throw error
    await existing.unsubscribe()
    return registration.pushManager.subscribe(options)
  }
}

async function sendToServer(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) throw new Error('Inscrição push inválida.')
  await pushApi.subscribe({ endpoint: json.endpoint, keys: { p256dh, auth } })
}

/**
 * Pede permissão (precisa vir de um clique do usuário), inscreve o aparelho e registra no backend.
 * Retorna a permissão final do navegador.
 */
export async function enablePush(): Promise<NotificationPermission> {
  if (!isPushSupported()) throw new Error('Este navegador não suporta notificações push.')

  const permission =
    Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return permission

  const registration = await getRegistration()
  const subscription = (await registration.pushManager.getSubscription()) ?? (await createSubscription(registration))
  await sendToServer(subscription)
  return permission
}

/**
 * Sem pedir permissão: se o usuário já autorizou, garante que a inscrição do aparelho esteja
 * salva para a conta logada (cobre troca de conta, nova chave VAPID ou inscrição expirada).
 */
export async function syncPushSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return
  const registration = await getRegistration()
  const subscription = (await registration.pushManager.getSubscription()) ?? (await createSubscription(registration))
  await sendToServer(subscription)
}

/**
 * Remove a inscrição do aparelho (logout). O aparelho para de receber pushes primeiro;
 * o aviso ao backend é best-effort e usa axios direto para não disparar o refresh/logout em loop.
 */
export async function disablePush(accessToken = loadSession()?.accessToken): Promise<void> {
  if (!isPushSupported()) return
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    if (accessToken) {
      await axios.post(
        `${API_BASE}/push/subscriptions/remover`,
        { endpoint },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
    }
  } catch {
    // best-effort
  }
}
