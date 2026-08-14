import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  // Full-width, near-full-height bottom sheet below `sm`; centered, capped-width
  // modal at `sm` and up.
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={clsx(
          'relative flex h-[92vh] w-full flex-col overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl dark:bg-slate-900',
          'sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:p-6',
          widths[size]
        )}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
