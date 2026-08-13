import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className
      )}
      {...rest}
    />
  )
}
