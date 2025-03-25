import { useState } from 'react'
import { cn } from '../lib/utils'

export function ToggleBar<T extends string>({
  onChange,
  defaultValue,
  value,
  options,
  className,
}: {
  onChange?: (value: T) => void
  defaultValue?: T
  value?: T
  options: (T | [T, string])[]
  className?: string
}) {
  if (value && defaultValue)
    throw new Error('Cannot use both value and defaultValue')
  const [selected, setSelected] = useState(defaultValue)
  const selectedValue = value ?? selected

  return (
    <div className={cn('flex gap-0 overflow-hidden rounded-lg', className)}>
      {options.map((v) => {
        const [optionValue, label] = Array.isArray(v) ? v : [v, v]
        return (
          <button
            key={optionValue}
            onClick={() => {
              if (value === undefined) setSelected(optionValue)
              onChange?.(optionValue)
            }}
            className={cn(
              'flex-1 p-1',
              selectedValue === optionValue &&
                'bg-primary text-primary-foreground',
              selectedValue !== optionValue &&
                'bg-muted text-muted-foreground hover:bg-slate-300 dark:hover:bg-slate-600',
            )}
            type="button"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
