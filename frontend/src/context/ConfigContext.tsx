import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getConfigData, updateConfig as apiUpdateConfig, type UserConfigs } from "@/lib/api";
import {useAuth} from '@/context/AuthContext'

type ConfigContextValue = {
  config: UserConfigs | null
  loading: boolean
  error: string | null
  refresh: () => void
  updateConfig: (key: keyof UserConfigs, val: boolean) => Promise<void>
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [config, setConfig] = useState<UserConfigs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setConfig(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getConfigData()
      .then((res) => {
        if (cancelled) return
        setConfig(res)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load config')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, refreshToken])

  const refresh = () => setRefreshToken((n) => n + 1)

  const updateConfig = async (key: keyof UserConfigs, val: boolean) => {
    const updated = await apiUpdateConfig({ key, val })
    setConfig(updated)
  }

  return (
    <ConfigContext.Provider value={{ config, loading, error, refresh, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within a ConfigProvider')
  return ctx
}