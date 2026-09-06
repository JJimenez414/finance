import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useConfig } from '@/context/ConfigContext'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-neutral-900' : 'bg-neutral-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const { config, updateConfig } = useConfig()
  const [openAddTran, setOpenAddTran] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOpenAddTran(config?.open_add_tran ?? false)
  }, [config])

  const handleToggle = async (value: boolean) => {
    setError(null)
    setOpenAddTran(value)
    try {
      await updateConfig('open_add_tran', value)
    } catch (err) {
      setOpenAddTran(!value)
      setError(err instanceof Error ? err.message : 'Failed to update setting')
    }
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
        <h1 className="text-lg font-bold text-neutral-900">Settings</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="flex-row items-center justify-between gap-4 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-neutral-900">Add Transaction Page</span>
          <span className="text-xs text-neutral-500">
            When you open the app, you will be prompted to add a transaction.
          </span>
        </div>
        <ToggleSwitch checked={openAddTran} onChange={handleToggle} />
      </Card>
    </div>
  )
}
