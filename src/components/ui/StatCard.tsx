import type { ComponentType } from 'react'
import { Card } from './Card'
import clsx from 'clsx'

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-600/20 dark:text-primary-300',
  success: 'bg-success-50 text-success-600 dark:bg-success-600/20 dark:text-success-300',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-600/20 dark:text-warning-300',
  info: 'bg-info-50 text-info-600 dark:bg-info-600/20 dark:text-info-300',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-600/20 dark:text-danger-300',
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'primary',
  subtext,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  tone?: Tone
  subtext?: string
  onClick?: () => void
}) {
  return (
    <Card className="p-5">
      <div className={clsx('mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg', toneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      {subtext && (
        <button
          onClick={onClick}
          disabled={!onClick}
          className={clsx(
            'mt-2 text-xs font-medium text-primary-600 dark:text-primary-400',
            onClick && 'hover:underline'
          )}
        >
          {subtext}
        </button>
      )}
    </Card>
  )
}
