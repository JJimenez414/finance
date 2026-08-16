import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { seedBudgets, type Budget, type Bucket } from '@/data/buckets'

const STORAGE_KEY = 'salung.budgets.v2'
const ACTIVE_BUDGET_KEY = 'salung.activeBudgetId'

export type NewBucketInput = {
  name: string
  subtitle: string
  icon: string
  iconBg: string
  budget: number
  spent: number
}

export type NewTransactionInput = {
  bucketId: string
  amount: number
  description: string
  /** Value from a `datetime-local` input. */
  date: string
}

type BucketsContextValue = {
  // Budgets (a budget is a balance split across buckets).
  budgets: Budget[]
  activeBudget: Budget
  switchBudget: (id: string) => void
  addBudget: (name: string) => Budget
  deleteBudget: (id: string) => void

  // Buckets within the active budget.
  buckets: Bucket[]
  getBucket: (id: string) => Bucket | undefined
  addBucket: (input: NewBucketInput) => Bucket
  updateBucket: (id: string, input: NewBucketInput) => void
  deleteBucket: (id: string) => void
  addTransaction: (input: NewTransactionInput) => void
  balance: number
  setBalance: (value: number) => void
  allocatedTotal: number
  unallocated: number
}

const BucketsContext = createContext<BucketsContextValue | null>(null)

function loadBudgets(): Budget[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return seedBudgets
  try {
    const parsed = JSON.parse(raw) as Budget[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedBudgets
  } catch {
    return seedBudgets
  }
}

function loadActiveBudgetId(fallback: string): string {
  return localStorage.getItem(ACTIVE_BUDGET_KEY) ?? fallback
}

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function makeUniqueId(name: string, existing: { id: string }[], fallback: string) {
  const base = slugify(name) || fallback
  let id = base
  let suffix = 2
  while (existing.some((item) => item.id === id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

export function BucketsProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>(loadBudgets)
  const [activeBudgetId, setActiveBudgetId] = useState<string>(() => loadActiveBudgetId(loadBudgets()[0].id))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets))
  }, [budgets])

  useEffect(() => {
    localStorage.setItem(ACTIVE_BUDGET_KEY, activeBudgetId)
  }, [activeBudgetId])

  const activeBudget = budgets.find((b) => b.id === activeBudgetId) ?? budgets[0]

  const switchBudget = (id: string) => {
    if (budgets.some((b) => b.id === id)) setActiveBudgetId(id)
  }

  const addBudget = (name: string) => {
    const newBudget: Budget = { id: makeUniqueId(name, budgets, 'budget'), name, balance: 0, buckets: [] }
    setBudgets((prev) => [...prev, newBudget])
    setActiveBudgetId(newBudget.id)
    return newBudget
  }

  const deleteBudget = (id: string) => {
    if (budgets.length <= 1) return
    const next = budgets.filter((b) => b.id !== id)
    setBudgets(next)
    if (activeBudgetId === id) setActiveBudgetId(next[0].id)
  }

  const allocatedTotal = activeBudget.buckets.reduce((sum, b) => sum + b.budget, 0)
  const unallocated = activeBudget.balance - allocatedTotal

  const getBucket = (id: string) => activeBudget.buckets.find((b) => b.id === id)

  // Changing the balance rescales every bucket's budget by the same ratio, so
  // each bucket keeps its relative share of the new balance (the split stays intact).
  const setBalance = (newBalance: number) => {
    const previousBalance = activeBudget.balance
    const scale = previousBalance > 0 ? newBalance / previousBalance : 1
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === activeBudget.id
          ? {
              ...b,
              balance: newBalance,
              buckets:
                previousBalance > 0
                  ? b.buckets.map((bucket) => ({ ...bucket, budget: Math.max(0, Math.round(bucket.budget * scale)) }))
                  : b.buckets,
            }
          : b,
      ),
    )
  }

  const addBucket = (input: NewBucketInput) => {
    const available = activeBudget.balance - allocatedTotal
    const newBucket: Bucket = {
      id: makeUniqueId(input.name, activeBudget.buckets, 'bucket'),
      name: input.name,
      subtitle: input.subtitle,
      icon: input.icon,
      iconBg: input.iconBg,
      budget: Math.min(Math.max(0, input.budget), Math.max(0, available)),
      spent: input.spent,
      changePercent: 0,
      changeSince: 'last month',
      monthlyAverage: input.spent,
      chart: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => ({ month, value: 0 })),
      transactions: [],
    }
    setBudgets((prev) => prev.map((b) => (b.id === activeBudget.id ? { ...b, buckets: [...b.buckets, newBucket] } : b)))
    return newBucket
  }

  const updateBucket = (id: string, input: NewBucketInput) => {
    setBudgets((prev) =>
      prev.map((b) => {
        if (b.id !== activeBudget.id) return b
        const otherAllocated = b.buckets.filter((x) => x.id !== id).reduce((sum, x) => sum + x.budget, 0)
        const available = b.balance - otherAllocated
        return {
          ...b,
          buckets: b.buckets.map((x) =>
            x.id === id
              ? {
                  ...x,
                  name: input.name,
                  subtitle: input.subtitle,
                  icon: input.icon,
                  iconBg: input.iconBg,
                  budget: Math.min(Math.max(0, input.budget), Math.max(0, available)),
                  spent: input.spent,
                }
              : x,
          ),
        }
      }),
    )
  }

  const deleteBucket = (id: string) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === activeBudget.id ? { ...b, buckets: b.buckets.filter((x) => x.id !== id) } : b)),
    )
  }

  const addTransaction = (input: NewTransactionInput) => {
    const parsedDate = new Date(input.date)
    const time = Number.isNaN(parsedDate.getTime())
      ? input.date
      : parsedDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

    setBudgets((prev) =>
      prev.map((b) => {
        if (b.id !== activeBudget.id) return b
        return {
          ...b,
          buckets: b.buckets.map((x) =>
            x.id === input.bucketId
              ? {
                  ...x,
                  spent: x.spent + input.amount,
                  transactions: [
                    {
                      id: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      title: input.description || 'Transaction',
                      subtitle: x.name,
                      amount: input.amount,
                      time,
                    },
                    ...x.transactions,
                  ],
                }
              : x,
          ),
        }
      }),
    )
  }

  return (
    <BucketsContext.Provider
      value={{
        budgets,
        activeBudget,
        switchBudget,
        addBudget,
        deleteBudget,
        buckets: activeBudget.buckets,
        getBucket,
        addBucket,
        updateBucket,
        deleteBucket,
        addTransaction,
        balance: activeBudget.balance,
        setBalance,
        allocatedTotal,
        unallocated,
      }}
    >
      {children}
    </BucketsContext.Provider>
  )
}

export function useBuckets() {
  const ctx = useContext(BucketsContext)
  if (!ctx) throw new Error('useBuckets must be used within a BucketsProvider')
  return ctx
}
