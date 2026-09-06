import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBuckets } from '@/context/BucketsContext'

function nowForInput() {
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

type AddTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  const { buckets, addTransaction } = useBuckets()

  const [amount, setAmount] = useState('')
  const [bucketId, setBucketId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(nowForInput)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the form fresh every time the dialog opens, since it's dynamic —
  // buckets can change between opens, and we don't want stale input carried over.
  useEffect(() => {
    if (open) {
      setAmount('')
      setBucketId('')
      setDescription('')
      setDate(nowForInput())
      setError(null)
    }
  }, [open])

  const amountValue = Number(amount)
  const canSubmit = amountValue > 0 && bucketId !== '' && description.trim() !== '' && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      await addTransaction({ bucketId, amount: amountValue, description: description.trim(), date })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transaction')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a transaction</DialogTitle>
          <DialogDescription>Quickly log a transaction before you get started.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt-txn-amount">Amount</Label>
            <Input
              id="prompt-txn-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt-txn-bucket">Bucket</Label>
            {buckets.length === 0 ? (
              <p className="text-sm text-neutral-400">Create a bucket first before adding a transaction.</p>
            ) : (
              <Select value={bucketId} onValueChange={(value) => setBucketId(value ?? '')}>
                <SelectTrigger id="prompt-txn-bucket" className="w-full">
                  <SelectValue placeholder="Choose a bucket" />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.icon} {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt-txn-description">Description</Label>
            <Input
              id="prompt-txn-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grocery run"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt-txn-date">Date &amp; time</Label>
            <Input
              id="prompt-txn-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip for now
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Adding…' : 'Add transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
