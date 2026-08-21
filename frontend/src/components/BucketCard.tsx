import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Bucket } from '@/data/buckets'
import { cn } from '@/lib/utils'

export function BucketCard({ bucket, onClick }: { bucket: Bucket; onClick?: () => void }) {
  const percent = bucket.budget > 0 ? Math.min(100, Math.round((bucket.spent / bucket.budget) * 100)) : 0
  const remaining = bucket.budget - bucket.spent
  const indicatorColor = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-orange-500' : 'bg-emerald-500'

  return (
    <Card onClick={onClick} className="cursor-pointer gap-3 rounded-3xl p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-base', bucket.iconBg)}>
            {bucket.icon}
          </div>
          <span className="font-semibold text-neutral-900">{bucket.name}</span>
        </div>
        <ChevronRight className="h-5 w-5 text-neutral-400" />
      </div>

      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-neutral-900">${bucket.spent.toLocaleString()}</span>
        <span className="text-neutral-400">of ${bucket.budget.toLocaleString()}</span>
      </div>

      <Progress value={percent} indicatorClassName={indicatorColor} className="h-1.5 bg-neutral-100" />

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{remaining >= 0 ? `$${remaining.toLocaleString()} left` : `$${Math.abs(remaining).toLocaleString()} over`}</span>
        <span className={cn('font-medium', percent >= 100 ? 'text-red-500' : 'text-neutral-700')}>{percent}%</span>
      </div>
    </Card>
  )
}
