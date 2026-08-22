import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Receipt } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useBuckets } from '@/context/BucketsContext'
import { getTransactionsForRange, type TransactionRangeItem } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type MonthPoint = { key: string; label: string; value: number }

type TimeFrame = 'day' | 'week' | 'month' | 'year'

const TIME_FRAMES: { value: TimeFrame; label: string; days: number }[] = [
  { value: 'day', label: 'Day', days: 1 },
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'year', label: 'Year', days: 365 },
]

function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Trailing window ending today, e.g. "week" = the last 7 days including today. */
function getRangeForTimeFrame(timeFrame: TimeFrame): { startDate: string; endDate: string; days: number } {
  const { days } = TIME_FRAMES.find((tf) => tf.value === timeFrame)!
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  return { startDate: toISODate(start), endDate: toISODate(end), days }
}

function formatTransactionDate(dateStr: string): string {
  const parsed = new Date(dateStr)
  return Number.isNaN(parsed.getTime())
    ? dateStr
    : parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const PERIOD_NOUN: Record<TimeFrame, string> = { day: 'hour', week: 'day', month: 'day', year: 'month' }

/**
 * Sums transactions into time buckets, oldest to newest, optionally filtered to one category.
 * Bucket granularity follows the time frame — hourly for a single day, daily for a week/month,
 * monthly for a year — since e.g. grouping one day's transactions by month would collapse to one point.
 */
function buildTrend(transactions: TransactionRangeItem[], category: string, timeFrame: TimeFrame): MonthPoint[] {
  const filtered = category === 'all' ? transactions : transactions.filter((t) => t.category === category)
  const totals = new Map<string, MonthPoint>()

  for (const t of filtered) {
    const parsed = new Date(t.date)
    if (Number.isNaN(parsed.getTime())) continue

    const year = parsed.getFullYear()
    const month = String(parsed.getMonth()).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')

    let key: string
    let label: string
    if (timeFrame === 'day') {
      key = `${year}-${month}-${day}-${String(parsed.getHours()).padStart(2, '0')}`
      label = parsed.toLocaleString(undefined, { hour: 'numeric' })
    } else if (timeFrame === 'year') {
      key = `${year}-${month}`
      label = parsed.toLocaleString(undefined, { month: 'short', year: '2-digit' })
    } else {
      key = `${year}-${month}-${day}`
      label = parsed.toLocaleString(undefined, { month: 'short', day: 'numeric' })
    }

    const existing = totals.get(key)
    if (existing) {
      existing.value += t.amount
    } else {
      totals.set(key, { key, label, value: t.amount })
    }
  }

  return [...totals.values()].sort((a, b) => a.key.localeCompare(b.key)).map((m) => ({ ...m, value: Math.round(m.value * 100) / 100 }))
}

export function Analytics() {
  const navigate = useNavigate()
  const { buckets } = useBuckets()
  const [category, setCategory] = useState('all')

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week')
  const [rangeTransactions, setRangeTransactions] = useState<TransactionRangeItem[]>([])
  const [rangeLoading, setRangeLoading] = useState(true)
  const [rangeError, setRangeError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRangeLoading(true)
    setRangeError(null)

    const { startDate, endDate, days } = getRangeForTimeFrame(timeFrame)

    getTransactionsForRange(startDate, endDate, days)
      .then((res) => {
        if (cancelled) return
        setRangeTransactions([...res.all_tran].sort((a, b) => b.date.localeCompare(a.date)))
      })
      .catch((err) => {
        if (cancelled) return
        setRangeError(err instanceof Error ? err.message : 'Failed to load transactions')
      })
      .finally(() => {
        if (!cancelled) setRangeLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [timeFrame])

  const trend = useMemo(() => buildTrend(rangeTransactions, category, timeFrame), [rangeTransactions, category, timeFrame])
  const total = useMemo(() => trend.reduce((sum, m) => sum + m.value, 0), [trend])
  const periodNoun = PERIOD_NOUN[timeFrame]

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
          <h1 className="text-lg font-bold text-neutral-900">Analytics</h1>
          <p className="text-xs text-neutral-500">All budgets</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {TIME_FRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeFrame(tf.value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                timeFrame === tf.value ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <Select value={category} onValueChange={(value) => setCategory(value ?? 'all')}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {buckets.map((b) => (
              <SelectItem key={b.id} value={b.name}>
                {b.icon} {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rangeLoading && <div className="flex justify-center py-16 text-sm text-neutral-500">Loading trend…</div>}

      {!rangeLoading && rangeError && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm text-red-600">{rangeError}</p>
        </div>
      )}

      {!rangeLoading && !rangeError && trend.length === 0 && (
        <Card className="items-center gap-1.5 rounded-3xl p-8 text-center shadow-sm">
          <p className="text-sm text-neutral-400">No spending yet for this filter</p>
        </Card>
      )}

      {!rangeLoading && !rangeError && trend.length > 0 && (
        <Card className="gap-3 rounded-3xl p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-sm font-semibold text-neutral-900">{category === 'all' ? 'All categories' : category}</p>
            <p className="text-xs text-neutral-500">
              Total spent <span className="font-semibold text-neutral-700">${total.toLocaleString()}</span> over{' '}
              {trend.length} {trend.length === 1 ? periodNoun : `${periodNoun}s`}
            </p>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 16, right: 8, left: 8 }}>
                <CartesianGrid vertical={false} stroke="#f5f5f5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                  width={56}
                />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Spent']} />
                <Line type="monotone" dataKey="value" stroke="#171717" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {!rangeLoading && !rangeError && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-neutral-900">All transactions</h2>

          {rangeTransactions.length === 0 && (
            <Card className="items-center gap-1.5 rounded-3xl p-8 text-center shadow-sm">
              <Receipt className="h-6 w-6 text-neutral-300" />
              <p className="text-sm text-neutral-400">No transactions in this period</p>
            </Card>
          )}

          {rangeTransactions.length > 0 && (
            <div className="flex flex-col gap-2 pb-4">
              {rangeTransactions.map((tx, index) => (
                <Card key={index} className="flex-row items-center gap-3 rounded-2xl p-3 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                    <Receipt className="h-4.5 w-4.5 text-neutral-700" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-neutral-900">{tx.description || tx.category}</span>
                    <span className="text-xs text-neutral-500">{tx.category}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-neutral-900">-${tx.amount.toFixed(2)}</span>
                    <span className="text-xs text-neutral-400">{formatTransactionDate(tx.date)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
