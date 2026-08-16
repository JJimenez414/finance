import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MoreVertical, ArrowUp, ArrowDown, Receipt, Plus, Pencil, Trash2 } from 'lucide-react'
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis } from 'recharts'
import { useBuckets, type NewBucketInput } from '@/context/BucketsContext'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BucketFormDialog } from '@/components/BucketFormDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function BucketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getBucket, updateBucket, deleteBucket, unallocated } = useBuckets()
  const bucket = getBucket(id ?? '')
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  if (!bucket) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <p className="text-neutral-500">Bucket not found</p>
        <button onClick={() => navigate('/')} className="text-sm font-semibold text-neutral-900 underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  const percent = bucket.budget > 0 ? Math.min(100, Math.round((bucket.spent / bucket.budget) * 100)) : 0
  const remaining = bucket.budget - bucket.spent
  const progressColor = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-orange-500' : 'bg-emerald-500'
  const isIncrease = bucket.changePercent >= 0

  const handleUpdate = async (input: NewBucketInput) => {
    setUpdateError(null)
    try {
      await updateBucket(bucket.id, input)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update bucket')
    }
  }

  const handleDelete = async () => {
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteBucket({ bucketId: bucket.id })
      navigate('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete bucket')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {(deleteError || updateError) && <p className="text-sm text-red-600">{deleteError ?? updateError}</p>}
      <header className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-base font-semibold text-neutral-900">Bucket Detail</h1>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                aria-label="More options"
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100"
              />
            }
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" disabled={deleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <BucketFormDialog
          bucket={bucket}
          open={editOpen}
          onOpenChange={setEditOpen}
          maxAmount={Math.max(0, unallocated) + bucket.budget}
          onSubmit={handleUpdate}
        />
      </header>

      <Card className="gap-5 rounded-3xl p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${bucket.iconBg}`}>
              {bucket.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">{bucket.name}</h2>
              <p className="text-sm text-neutral-500">{bucket.subtitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end">
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white',
                isIncrease ? 'bg-red-500' : 'bg-emerald-500',
              )}
            >
              {isIncrease ? <ArrowUp className="h-3 w-3" strokeWidth={3} /> : <ArrowDown className="h-3 w-3" strokeWidth={3} />}
              {Math.abs(bucket.changePercent)}.00%
            </span>
            <span className="mt-1 text-xs text-neutral-500">
              {isIncrease ? 'Increased' : 'Decreased'} since {bucket.changeSince}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-lg font-bold text-neutral-900">
            <span>${bucket.spent.toLocaleString()}</span>
            <span className="text-neutral-300">of ${bucket.budget.toLocaleString()}</span>
          </div>
          <Progress value={percent} indicatorClassName={progressColor} className="h-1.5 bg-neutral-100" />
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              {remaining >= 0
                ? `$${remaining.toLocaleString()} left this month`
                : `$${Math.abs(remaining).toLocaleString()} over budget`}
            </span>
            <span className={cn('font-medium', percent >= 100 ? 'text-red-500' : 'text-neutral-700')}>{percent}%</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card className="gap-3 rounded-3xl p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Spending Analytics</p>
              <p className="text-xs text-neutral-500">
                Average per month{' '}
                <span className="font-semibold text-neutral-700">${bucket.monthlyAverage.toLocaleString()}</span>
              </p>
            </div>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bucket.chart} barCategoryGap="30%" margin={{ top: 24 }}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#a3a3a3', fontSize: 11 }} />
                  <Bar dataKey="value" fill="#171717" radius={[6, 6, 6, 6]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={(value) => `$${Number(value).toLocaleString()}`}
                      className="fill-neutral-700 text-[10px] font-medium"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="hidden gap-3 lg:flex">
            <Button
              className="flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
              onClick={() => navigate(`/transactions/new?bucket=${bucket.id}`)}
            >
              <Plus className="h-4 w-4" />
              Add expense
            </Button>
            <Button
              variant="outline"
              className="flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit bucket
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-base font-bold text-neutral-900">Transactions</h2>

          <div className="flex flex-col gap-2 pb-32 lg:pb-4">
            {bucket.transactions.length === 0 && (
              <Card className="items-center gap-1.5 rounded-3xl p-8 text-center shadow-sm">
                <Receipt className="h-6 w-6 text-neutral-300" />
                <p className="text-sm text-neutral-400">No transactions yet</p>
              </Card>
            )}
            {bucket.transactions.map((tx) => (
              <Card key={tx.id} className="flex-row items-center gap-3 rounded-2xl p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
                  <Receipt className="h-4.5 w-4.5 text-neutral-700" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-neutral-900">{tx.title}</span>
                  <span className="text-xs text-neutral-500">{tx.subtitle}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-neutral-900">-${tx.amount.toFixed(2)}</span>
                  <span className="text-xs text-neutral-400">{tx.time}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-24 z-10 px-4 lg:hidden">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => navigate(`/transactions/new?bucket=${bucket.id}`)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 py-4 text-sm font-semibold text-white shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add expense
          </button>
        </div>
      </div>
    </div>
  )
}
