import { useState } from 'react'
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

type NewBudgetDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => void
}

export function NewBudgetDialog({ open, onOpenChange, onCreate }: NewBudgetDialogProps) {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) return
    onCreate(name.trim())
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New budget</DialogTitle>
          <DialogDescription>A budget has its own balance and buckets, separate from your others.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget-name">Name</Label>
          <Input
            id="budget-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Business"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
