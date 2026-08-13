import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

const baseInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-primary-900'

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {children}
      {required && <span className="text-danger-600"> *</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={clsx(baseInput, className)} {...rest} />
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select ref={ref} className={clsx(baseInput, className)} {...rest}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea ref={ref} className={clsx(baseInput, className)} {...rest} />
  )
)
TextArea.displayName = 'TextArea'

export function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  )
}
