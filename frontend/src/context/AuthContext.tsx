import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { login as apiLogin, getToken, setToken, AUTH_EXPIRED_EVENT, type User } from '@/lib/api'

const STORAGE_KEY = 'salung.auth.user'

type AuthContextValue = {
  isAuthenticated: boolean
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => (getToken() ? loadUser() : null))

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  useEffect(() => {
    const handleAuthExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password)
    setToken(res.access_token)
    setUser(res.user)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: user !== null, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
