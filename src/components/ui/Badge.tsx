import clsx from 'clsx'

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'primary'

const toneClasses: Record<Tone, string> = {
  success: 'bg-success-50 text-success-700 dark:bg-success-600/20 dark:text-success-100',
  warning: 'bg-warning-50 text-warning-700 dark:bg-warning-600/20 dark:text-warning-100',
  info: 'bg-info-50 text-info-700 dark:bg-info-600/20 dark:text-info-100',
  danger: 'bg-danger-50 text-danger-700 dark:bg-danger-600/20 dark:text-danger-100',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-100',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  )
}

const jobStatusTone: Record<string, Tone> = {
  received: 'neutral',
  diagnosed: 'info',
  estimate_sent: 'warning',
  approved: 'primary',
  in_repair: 'warning',
  qc: 'info',
  ready_for_pickup: 'info',
  delivered: 'success',
  declined: 'danger',
}

const invoiceStatusTone: Record<string, Tone> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'danger',
}

const sellRequestStatusTone: Record<string, Tone> = {
  new: 'neutral',
  under_review: 'info',
  offer_sent: 'warning',
  negotiating: 'warning',
  accepted: 'primary',
  rejected: 'danger',
  device_received: 'info',
  inspected: 'info',
  paid_out: 'success',
}

const warrantyStatusTone: Record<string, Tone> = {
  active: 'success',
  expired: 'danger',
  claimed: 'warning',
}

export function StatusBadge({
  status,
  kind,
  label,
}: {
  status: string
  kind: 'job' | 'invoice' | 'sell_request' | 'warranty'
  label: string
}) {
  const toneMap =
    kind === 'job'
      ? jobStatusTone
      : kind === 'invoice'
        ? invoiceStatusTone
        : kind === 'sell_request'
          ? sellRequestStatusTone
          : warrantyStatusTone
  return <Badge tone={toneMap[status] ?? 'neutral'}>{label}</Badge>
}
