import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { mapFinanceData, type Budget, type Bucket } from '@/data/buckets'
import {
  getFinanceData,
  addTransaction as apiAddTransaction,
  deleteCategory as apiDeleteCategory,
  updateCategory as apiUpdateCategory,
  updateBudget as apiUpdateBudget,
  createBudget as apiCreateBudget,
  createCategory as apiCreateCategory,
  getCategories,
} from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const ACTIVE_BUDGET_KEY = 'salung.activeBudgetId'

const EMPTY_BUDGET: Budget = { id: 'empty', name: 'No budgets yet', balance: 0, buckets: [] }

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

export type DeleteBucketInput = {
  bucketId: string
}

type BucketsContextValue = {
  // Budgets (a budget is a balance split across buckets).
  budgets: Budget[]
  activeBudget: Budget
  switchBudget: (id: string) => void
  addBudget: (name: string) => Promise<void>
  deleteBudget: (id: string) => void

  // Buckets within the active budget.
  buckets: Bucket[]
  getBucket: (id: string) => Bucket | undefined
  addBucket: (input: NewBucketInput) => Promise<void>
  updateBucket: (id: string, input: NewBucketInput) => Promise<void>
  deleteBucket: (input: DeleteBucketInput) => Promise<void>
  addTransaction: (input: NewTransactionInput) => Promise<void>
  balance: number
  setBalance: (value: number) => Promise<void>
  allocatedTotal: number
  unallocated: number
  loading: boolean
  error: string | null
  refresh: () => void
}

const BucketsContext = createContext<BucketsContextValue | null>(null)

function loadActiveBudgetId(): string | null {
  return localStorage.getItem(ACTIVE_BUDGET_KEY)
}

export function BucketsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(loadActiveBudgetId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setBudgets([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getFinanceData()
      .then((data) => {
        if (cancelled) return
        const mapped = mapFinanceData(data)
        setBudgets(mapped)
        setActiveBudgetId((prev) => (prev && mapped.some((b) => b.id === prev) ? prev : (mapped[0]?.id ?? null)))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load finance data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, refreshToken])

  useEffect(() => {
    if (activeBudgetId) localStorage.setItem(ACTIVE_BUDGET_KEY, activeBudgetId)
  }, [activeBudgetId])

  const refresh = () => setRefreshToken((n) => n + 1)

  const activeBudget = budgets.find((b) => b.id === activeBudgetId) ?? budgets[0] ?? EMPTY_BUDGET

  const switchBudget = (id: string) => {
    if (budgets.some((b) => b.id === id)) setActiveBudgetId(id)
  }

  const addBudget = async (name: string) => {
    const { id } = await apiCreateBudget({ totalBudget: 0, description: name })
    setActiveBudgetId(String(id))
    refresh()
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
  const setBalance = async (newBalance: number) => {
    const previousBalance = activeBudget.balance
    const scale = previousBalance > 0 ? newBalance / previousBalance : 1

    await apiUpdateBudget({
      budgetId: activeBudget.id,
      totalBudget: newBalance,
      categories: activeBudget.buckets.map((bucket) => ({
        category: bucket.name,
        amount: previousBalance > 0 ? Math.max(0, Math.round(bucket.budget * scale)) : bucket.budget,
      })),
    })

    refresh()
  }

  const addBucket = async (input: NewBucketInput) => {
    const available = activeBudget.balance - allocatedTotal
    const amount = Math.min(Math.max(0, input.budget), Math.max(0, available))

    // createCategory creates both the user_categories row and the budgets row
    // together, so (unlike buckets from addTransaction/createBudget) this one
    // will always be rename/delete-able afterward.
    await apiCreateCategory({
      name: input.name,
      color: input.iconBg,
      amount,
      budgetId: activeBudget.id,
    })

    refresh()
  }

  const updateBucket = async (id: string, input: NewBucketInput) => {
    const bucket = activeBudget.buckets.find((b) => b.id === id)
    if (!bucket) return

    const otherAllocated = activeBudget.buckets.filter((x) => x.id !== id).reduce((sum, x) => sum + x.budget, 0)
    const available = activeBudget.balance - otherAllocated
    const amount = Math.min(Math.max(0, input.budget), Math.max(0, available))

    // Renaming requires a user_categories row: /updateCategory cascades the
    // rename onto existing transactions server-side. Many buckets don't have
    // one (db_add_transaction/db_create_budget insert straight into `budgets`
    // without ever creating a user_categories row) — renaming those would
    // orphan their transactions, so we refuse rather than silently no-op.
    if (input.name !== bucket.name) {
      const { categories } = await getCategories()
      const match = categories.find((c) => c.name === bucket.name)
      if (!match) {
        throw new Error(`"${bucket.name}" can't be renamed — it has no matching category record on the backend.`)
      }
      await apiUpdateCategory({ categoryId: match.id, name: input.name, color: input.iconBg })
    }

    // /updateBudget replaces the whole category list for the budget, so we
    // resend every bucket's amount, substituting the (possibly renamed) one.
    await apiUpdateBudget({
      budgetId: activeBudget.id,
      totalBudget: activeBudget.balance,
      categories: activeBudget.buckets.map((x) => ({
        category: x.id === id ? input.name : x.name,
        amount: x.id === id ? amount : x.budget,
      })),
    })

    refresh()
  }

  const deleteBucket = async (input: DeleteBucketInput) => {
    const bucket = activeBudget.buckets.find((b) => b.id === input.bucketId)
    if (!bucket) return

    // /deleteCategory/{id} keys off the user's category catalog (user_categories.id),
    // which /get_finance_data never returns — so it has to be looked up by name first.
    // Buckets created via addTransaction/createBudget never get a user_categories
    // row, so this lookup can legitimately fail — surface that instead of no-op'ing.
    const { categories } = await getCategories()
    const match = categories.find((c) => c.name === bucket.name)
    if (!match) {
      throw new Error(`"${bucket.name}" can't be deleted — it has no matching category record on the backend.`)
    }

    await apiDeleteCategory({ categoryId: match.id, budgetId: activeBudget.id })

    refresh()
  }

  const addTransaction = async (input: NewTransactionInput) => {
    const bucket = activeBudget.buckets.find((b) => b.id === input.bucketId)
    if (!bucket) return

    await apiAddTransaction({
      date: input.date,
      category: bucket.name,
      amount: input.amount,
      description: input.description,
      budgetId: activeBudget.id,
    })

    refresh()
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
        loading,
        error,
        refresh,
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
