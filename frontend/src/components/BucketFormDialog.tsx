import { useEffect, useState, type ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ICON_OPTIONS, ICON_COLOR_OPTIONS, type Bucket } from '@/data/buckets'
import type { NewBucketInput } from '@/context/BucketsContext'
import { cn } from '@/lib/utils'

type BucketFormDialogProps = {
  trigger?: ReactElement
  bucket?: Bucket
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSubmit: (input: NewBucketInput) => void
  /** Most this bucket's budget can be set to (unallocated balance + its current budget). */
  maxAmount: number
}

const emptyForm: NewBucketInput = {
  name: '',
  subtitle: '',
  icon: ICON_OPTIONS[0],
  iconBg: ICON_COLOR_OPTIONS[0],
  budget: 0,
  spent: 0,
}

export function BucketFormDialog({ trigger, bucket, open, onOpenChange, onSubmit, maxAmount }: BucketFormDialogProps) {
  const [form, setForm] = useState<NewBucketInput>(bucket ?? emptyForm)
  const [amountText, setAmountText] = useState(bucket ? String(bucket.budget) : '')

  useEffect(() => {
    if (open) {
      setForm(
        bucket
          ? {
              name: bucket.name,
              subtitle: bucket.subtitle,
              icon: bucket.icon,
              iconBg: bucket.iconBg,
              budget: bucket.budget,
              spent: bucket.spent,
            }
          : emptyForm,
      )
      setAmountText(bucket ? String(bucket.budget) : '')
    }
  }, [open, bucket])

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSubmit({ ...form, budget: Math.min(Math.max(0, form.budget), maxAmount) })
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bucket ? 'Edit bucket' : 'New bucket'}</DialogTitle>
          <DialogDescription>
            {bucket ? 'Update this bucket’s details.' : 'Split part of your balance into a new bucket.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bucket-name">Name</Label>
            <Input
              id="bucket-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Entertainment"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bucket-subtitle">Description</Label>
            <Input
              id="bucket-subtitle"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Short description"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bucket-amount">Amount</Label>
            <Input
              id="bucket-amount"
              type="number"
              min={0}
              max={maxAmount}
              value={amountText}
              onChange={(e) => {
                const raw = e.target.value
                setAmountText(raw)
                setForm((f) => ({ ...f, budget: raw === '' ? 0 : Math.min(Math.max(0, Number(raw)), maxAmount) }))
              }}
            />
            <p className="text-xs text-neutral-500">${maxAmount.toLocaleString()} available to allocate</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-base transition',
                    form.icon === icon ? 'border-neutral-900 ring-2 ring-neutral-900/20' : 'border-neutral-200',
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, iconBg: color }))}
                  className={cn(
                    'h-8 w-8 rounded-full border transition',
                    color,
                    form.iconBg === color ? 'border-neutral-900 ring-2 ring-neutral-900/20' : 'border-neutral-200',
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim()}>
            {bucket ? 'Save changes' : 'Create bucket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
