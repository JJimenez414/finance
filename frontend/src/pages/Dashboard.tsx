import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileClock, LogOut, MoreVertical, Pencil, ChevronDown, Check } from 'lucide-react'
import { useBuckets, type NewBucketInput } from '@/context/BucketsContext'
import { useAuth } from '@/context/AuthContext'
import { BucketCard } from '@/components/BucketCard'
import { BucketFormDialog } from '@/components/BucketFormDialog'
import { BalanceDialog } from '@/components/BalanceDialog'
import { NewBudgetDialog } from '@/components/NewBudgetDialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const actions = [
  { label: 'Add transaction', icon: Plus, to: '/transactions/new' },
  { label: 'History', icon: FileClock, to: '/history' },
]

export function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const {
    budgets,
    activeBudget,
    switchBudget,
    addBudget,
    buckets,
    addBucket,
    balance,
    setBalance,
    allocatedTotal,
    unallocated,
    loading,
    error,
    refresh,
  } = useBuckets()
  const [createOpen, setCreateOpen] = useState(false)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [newBudgetOpen, setNewBudgetOpen] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [bucketError, setBucketError] = useState<string | null>(null)

  const handleSaveBalance = async (value: number) => {
    setBalanceError(null)
    try {
      await setBalance(value)
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : 'Failed to update balance')
    }
  }

  const handleCreateBudget = async (name: string) => {
    setBudgetError(null)
    try {
      await addBudget(name)
    } catch (err) {
      setBudgetError(err instanceof Error ? err.message : 'Failed to create budget')
    }
  }

  const handleCreateBucket = async (input: NewBucketInput) => {
    setBucketError(null)
    try {
      await addBucket(input)
    } catch (err) {
      setBucketError(err instanceof Error ? err.message : 'Failed to create bucket')
    }
  }

  const allocatedPercent = balance > 0 ? Math.min(100, Math.round((allocatedTotal / balance) * 100)) : 0

  if (loading) {
    return <div className="flex justify-center py-24 text-sm text-neutral-500">Loading your budgets…</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={refresh} className="text-sm font-semibold text-neutral-900 underline">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Welcome, {user?.username}</h1>
        <div className="flex items-center gap-1 text-neutral-500">
          <button
            aria-label="Log out"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="relative flex flex-col gap-6 rounded-3xl bg-neutral-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="Balance options"
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white sm:top-6 sm:right-6"
              />
            }
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setBalanceOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit balance
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-col items-center sm:items-start">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-400" />
              }
            >
              {activeBudget.name}
              <ChevronDown className="h-3 w-3" strokeWidth={3} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {budgets.map((b) => (
                <DropdownMenuItem key={b.id} onClick={() => switchBudget(b.id)}>
                  {b.id === activeBudget.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="w-4" />
                  )}
                  {b.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => setNewBudgetOpen(true)}>
                <Plus className="h-4 w-4" />
                New budget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="mt-4 text-xs text-neutral-400 sm:mt-6">My Balance</p>
          <p className="text-3xl font-bold sm:text-4xl">${balance.toLocaleString()}</p>
        </div>

        <Separator className="bg-white/10 sm:hidden" />

        <div className="flex justify-between gap-2 sm:gap-4">
          {actions.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={to ? () => navigate(to) : undefined}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-700/70 transition hover:bg-neutral-600 sm:h-12 sm:w-12">
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <span className="text-[11px] text-neutral-300 sm:text-xs">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {(balanceError || budgetError || bucketError) && (
        <p className="text-sm text-red-600">{balanceError ?? budgetError ?? bucketError}</p>
      )}
      <BalanceDialog open={balanceOpen} onOpenChange={setBalanceOpen} currentBalance={balance} onSave={handleSaveBalance} />
      <NewBudgetDialog open={newBudgetOpen} onOpenChange={setNewBudgetOpen} onCreate={handleCreateBudget} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">Your buckets</h2>
          <BucketFormDialog
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New bucket
              </Button>
            }
            open={createOpen}
            onOpenChange={setCreateOpen}
            maxAmount={Math.max(0, unallocated)}
            onSubmit={handleCreateBucket}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              ${allocatedTotal.toLocaleString()} split across buckets of ${balance.toLocaleString()}
            </span>
            <span className={cn('font-medium', unallocated < 0 ? 'text-red-500' : 'text-neutral-700')}>
              {unallocated >= 0
                ? `$${unallocated.toLocaleString()} unallocated`
                : `$${Math.abs(unallocated).toLocaleString()} over-allocated`}
            </span>
          </div>
          <Progress
            value={allocatedPercent}
            indicatorClassName={unallocated < 0 ? 'bg-red-500' : 'bg-neutral-900'}
            className="h-1.5 bg-neutral-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((bucket) => (
            <BucketCard key={bucket.id} bucket={bucket} onClick={() => navigate(`/buckets/${bucket.id}`)} />
          ))}
        </div>
      </section>
    </div>
  )
}
