import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useBuckets } from '@/context/BucketsContext'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function nowForInput() {
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export function AddTransaction() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { buckets, addTransaction } = useBuckets()

  const preselected = searchParams.get('bucket')
  const [amount, setAmount] = useState('')
  const [bucketId, setBucketId] = useState(preselected && buckets.some((b) => b.id === preselected) ? preselected : '')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(nowForInput)

  const amountValue = Number(amount)
  const canSubmit = amountValue > 0 && bucketId !== '' && description.trim() !== ''

  const handleSubmit = () => {
    if (!canSubmit) return
    addTransaction({ bucketId, amount: amountValue, description: description.trim(), date })
    navigate(`/buckets/${bucketId}`)
  }

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
        <h1 className="text-lg font-bold text-neutral-900">Add transaction</h1>
      </header>

      <Card className="gap-4 rounded-3xl p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="txn-amount">Amount</Label>
          <Input
            id="txn-amount"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="txn-bucket">Bucket</Label>
          {buckets.length === 0 ? (
            <p className="text-sm text-neutral-400">Create a bucket first before adding a transaction.</p>
          ) : (
            <Select value={bucketId} onValueChange={(value) => setBucketId(value ?? '')}>
              <SelectTrigger id="txn-bucket" className="w-full">
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
          <Label htmlFor="txn-description">Description</Label>
          <Input
            id="txn-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Grocery run"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="txn-date">Date &amp; time</Label>
          <Input id="txn-date" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </Card>

      <Button onClick={handleSubmit} disabled={!canSubmit} className="rounded-full py-3.5 text-sm font-semibold">
        Add transaction
      </Button>
    </div>
  )
}
