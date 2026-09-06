import type { ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ScrollToTop } from '@/components/ScrollToTop'
import { BucketsProvider } from '@/context/BucketsContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ConfigProvider } from '@/context/ConfigContext'
import { Dashboard } from '@/pages/Dashboard'
import { BucketDetail } from '@/pages/BucketDetail'
import { AddTransaction } from '@/pages/AddTransaction'
import { History } from '@/pages/History'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'

function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/buckets/:id" element={<BucketDetail />} />
                <Route path="/transactions/new" element={<AddTransaction />} />
                <Route path="/history" element={<History />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <BucketsProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
        </BucketsProvider>
      </ConfigProvider>
    </AuthProvider>
  )
}

export default App