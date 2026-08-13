import clsx from 'clsx'

export function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option)
        return (
          <button
            type="button"
            key={option}
            onClick={() => toggle(option)}
            className={clsx(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-100'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
