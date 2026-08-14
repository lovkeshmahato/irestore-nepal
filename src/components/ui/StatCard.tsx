import type { ComponentType } from 'react'
import { Card } from './Card'
import clsx from 'clsx'

export type StatTone = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const toneClasses: Record<StatTone, string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-600/20 dark:text-primary-300',
  success: 'bg-success-50 text-success-600 dark:bg-success-600/20 dark:text-success-300',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-600/20 dark:text-warning-300',
  info: 'bg-info-50 text-info-600 dark:bg-info-600/20 dark:text-info-300',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-600/20 dark:text-danger-300',
}

// Signature detail shared by every stat card across Dashboard/Reports: a
// thin colored top border matching the card's category tone.
const topBorderClasses: Record<StatTone, string> = {
  primary: 'border-t-primary-600',
  success: 'border-t-success-600',
  warning: 'border-t-warning-600',
  info: 'border-t-info-600',
  danger: 'border-t-danger-600',
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
  tone?: StatTone
  subtext?: string
  onClick?: () => void
}) {
  return (
    <Card className={clsx('border-t-4 p-5', topBorderClasses[tone])}>
      <div className={clsx('mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg', toneClasses[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</div>
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
