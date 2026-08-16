import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Receipt } from 'lucide-react'
import { useBuckets } from '@/context/BucketsContext'
import { getTransactions, type FinanceTransaction } from '@/lib/api'
import { Card } from '@/components/ui/card'

function formatDate(dateStr: string): string {
  const parsed = new Date(dateStr)
  return Number.isNaN(parsed.getTime())
    ? dateStr
    : parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function History() {
  const navigate = useNavigate()
  const { activeBudget } = useBuckets()
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getTransactions(activeBudget.id)
      .then((res) => {
        if (cancelled) return
        setTransactions(res.transactions)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeBudget.id])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-neutral-900">History</h1>
          <p className="text-xs text-neutral-500">{activeBudget.name}</p>
        </div>
      </header>

      {loading && <div className="flex justify-center py-16 text-sm text-neutral-500">Loading transactions…</div>}

      {!loading && error && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && transactions.length === 0 && (
        <Card className="items-center gap-1.5 rounded-3xl p-8 text-center shadow-sm">
          <Receipt className="h-6 w-6 text-neutral-300" />
          <p className="text-sm text-neutral-400">No transactions yet</p>
        </Card>
      )}

      {!loading && !error && transactions.length > 0 && (
        <div className="flex flex-col gap-2 pb-4">
          {transactions.map((tx) => (
            <Card key={tx.id} className="flex-row items-center gap-3 rounded-2xl p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                <Receipt className="h-4.5 w-4.5 text-neutral-700" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-semibold text-neutral-900">{tx.description || tx.category}</span>
                <span className="text-xs text-neutral-500">{tx.category}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-neutral-900">-${tx.amount.toFixed(2)}</span>
                <span className="text-xs text-neutral-400">{formatDate(tx.date)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
