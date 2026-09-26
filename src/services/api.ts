import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  user: import('@/types').User
}

const SESSION_KEY = 'artistPlatform.auth'

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

export function saveSession(session: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

api.interceptors.request.use((config) => {
  const session = loadSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  const session = loadSession()
  if (!session?.refreshToken) return null
  try {
    const response = await axios.post<import('@/types').AuthResponse>(`${API_BASE}/auth/refresh`, {
      refreshToken: session.refreshToken,
    })
    const { accessToken, refreshToken, user } = response.data
    saveSession({ accessToken: accessToken, refreshToken, user })
    return accessToken
  } catch {
    clearSession()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/login')) {
      original._retry = true
      refreshing = refreshing ?? tryRefresh()
      const token = await refreshing
      refreshing = null
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` }
        return api(original)
      }
      onSessionExpired?.()
    }
    return Promise.reject(error)
  }
)

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
    if (error.message) return error.message
  }
  return 'Erro inesperado. Tente novamente.'
}
