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

type CloneBalanceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultName: string
  onClone: (name: string) => void
}

export function CloneBalanceDialog({ open, onOpenChange, defaultName, onClone }: CloneBalanceDialogProps) {
  const [name, setName] = useState(defaultName)

  // Reseed the input with the suggested name each time the dialog opens,
  // since defaultName depends on whichever balance is active.
  useEffect(() => {
    if (open) setName(defaultName)
  }, [open, defaultName])

  const handleSubmit = () => {
    if (!name.trim()) return
    onClone(name.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Clone balance</DialogTitle>
          <DialogDescription>
            Creates a new balance with the same buckets and amounts, but no transaction history.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="clone-balance-name">Name</Label>
          <Input
            id="clone-balance-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Personal (Copy)"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Clone balance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
