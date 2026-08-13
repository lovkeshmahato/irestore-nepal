import { Check } from 'lucide-react'
import clsx from 'clsx'
import { JOB_STATUS_FLOW, JOB_STATUS_LABELS, type JobStatus } from '../../../types'

export function StatusPipeline({
  status,
  onAdvance,
  onDecline,
  canChange,
}: {
  status: JobStatus
  onAdvance: (next: JobStatus) => void
  onDecline: () => void
  canChange: boolean
}) {
  if (status === 'declined') {
    return <p className="text-sm font-medium text-danger-600">Declined / Cancelled by customer</p>
  }

  const currentIndex = JOB_STATUS_FLOW.indexOf(status)
  const nextStatus = JOB_STATUS_FLOW[currentIndex + 1]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {JOB_STATUS_FLOW.map((s, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <div key={s} className="flex items-center">
              <div
                className={clsx(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                  done && 'bg-success-50 text-success-700 dark:bg-success-600/20 dark:text-success-200',
                  active && 'bg-primary-600 text-white',
                  !done && !active && 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                )}
              >
                {done && <Check className="h-3 w-3" />}
                {JOB_STATUS_LABELS[s]}
              </div>
              {i < JOB_STATUS_FLOW.length - 1 && <div className="mx-1 h-px w-3 bg-slate-200 dark:bg-slate-700" />}
            </div>
          )
        })}
      </div>

      {canChange && (
        <div className="mt-4 flex gap-2">
          {nextStatus && (
            <button
              onClick={() => onAdvance(nextStatus)}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Advance to {JOB_STATUS_LABELS[nextStatus]}
            </button>
          )}
          {status !== 'delivered' && (
            <button
              onClick={onDecline}
              className="rounded-lg border border-danger-200 px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50 dark:border-danger-800 dark:hover:bg-danger-600/10"
            >
              Mark Declined/Cancelled
            </button>
          )}
        </div>
      )}
    </div>
  )
}
