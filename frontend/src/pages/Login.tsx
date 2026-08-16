import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = email.trim() !== '' && password.trim() !== ''

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    login(email.trim())
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-100 px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-neutral-900">Salung</span>
        </div>

        <Card className="w-full gap-5 rounded-3xl p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-bold text-neutral-900">Welcome back</h1>
            <p className="text-sm text-neutral-500">Log in to manage your budgets</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Username</Label>
              <Input
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={!canSubmit} className="mt-1 w-full">
              Log in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
