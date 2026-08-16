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

type BalanceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  onSave: (value: number) => void
}

export function BalanceDialog({ open, onOpenChange, currentBalance, onSave }: BalanceDialogProps) {
  const [value, setValue] = useState(currentBalance)

  useEffect(() => {
    if (open) setValue(currentBalance)
  }, [open, currentBalance])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit balance</DialogTitle>
          <DialogDescription>
            This is the total balance your buckets split. Changing it rescales every bucket proportionally.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="balance-amount">Balance</Label>
          <Input
            id="balance-amount"
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              onSave(value)
              onOpenChange(false)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
