import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/services'
import { api, clearSession, loadSession, saveSession, setSessionExpiredHandler, type StoredSession } from '@/services/api'
import type { AuthResponse, User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  registerArtist: (payload: Record<string, unknown>) => Promise<User>
  registerContractor: (payload: Record<string, unknown>) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyAuthResponse(data: AuthResponse): User {
  const session: StoredSession = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  }
  saveSession(session)
  return data.user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadSession()?.user ?? null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setSessionExpiredHandler(logout)
  }, [logout])

  // Persistência de sessão: recarrega o usuário a partir do token salvo (PRD §5).
  useEffect(() => {
    const session = loadSession()
    if (!session) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then((response) => {
        const fresh = response.data as User
        setUser(fresh)
        const current = loadSession()
        if (current) saveSession({ ...current, user: fresh })
      })
      .catch(() => {
        // token inválido: o interceptor tenta refresh; se falhar, limpa
        if (!loadSession()) setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password) as { data: AuthResponse }
    const u = applyAuthResponse(data)
    setUser(u)
    return u
  }, [])

  const registerArtist = useCallback(async (payload: Record<string, unknown>) => {
    const { data } = await authApi.registerArtist(payload) as { data: AuthResponse }
    const u = applyAuthResponse(data)
    setUser(u)
    return u
  }, [])

  const registerContractor = useCallback(async (payload: Record<string, unknown>) => {
    const { data } = await authApi.registerContractor(payload) as { data: AuthResponse }
    const u = applyAuthResponse(data)
    setUser(u)
    return u
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.me() as { data: User }
    setUser(data)
    const current = loadSession()
    if (current) saveSession({ ...current, user: data })
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!loadSession(),
      isLoading,
      login,
      registerArtist,
      registerContractor,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, registerArtist, registerContractor, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}

export { api }
