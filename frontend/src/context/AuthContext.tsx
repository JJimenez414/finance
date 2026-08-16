import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'salung.auth'

type AuthContextValue = {
  isAuthenticated: boolean
  userEmail: string | null
  login: (email: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUserEmail(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(loadUserEmail)

  useEffect(() => {
    if (userEmail) localStorage.setItem(STORAGE_KEY, userEmail)
    else localStorage.removeItem(STORAGE_KEY)
  }, [userEmail])

  const login = (email: string) => setUserEmail(email)
  const logout = () => setUserEmail(null)

  return (
    <AuthContext.Provider value={{ isAuthenticated: userEmail !== null, userEmail, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
