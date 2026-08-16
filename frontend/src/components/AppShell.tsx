import type { ReactNode } from 'react'
import { Home, PieChart, FileText, User, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', icon: Home, active: true },
  { label: 'Analytics', icon: PieChart, active: false },
  { label: 'Reports', icon: FileText, active: false },
  { label: 'Profile', icon: User, active: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-neutral-100">
      <div className="flex w-full">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-neutral-200 bg-white px-4 py-6 md:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg font-bold text-neutral-900">Salung</span>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100',
                )}
              >
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                {label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-h-svh flex-1 bg-white px-4 pb-24 pt-6 sm:px-8 md:pb-10 lg:px-12">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-3 z-20 flex justify-center px-4 md:hidden">
        <div className="flex items-center gap-2 rounded-full bg-neutral-900 px-2 py-2 shadow-lg">
          {navItems.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full',
                active ? 'bg-white text-neutral-900' : 'text-white/60',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
