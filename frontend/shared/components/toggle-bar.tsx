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
    <div
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-center gap-[1px] rounded-md p-1',
        className,
      )}
    >
      {options.map((v) => {
        const [optionValue, label] = Array.isArray(v) ? v : [v, v]
        return (
          <button
            key={optionValue}
            onClick={() => {
              if (value === undefined) setSelected(optionValue)
              onChange?.(optionValue)
            }}
            className="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:hover:bg-background/80 inline-flex grow items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm"
            data-state={optionValue === selectedValue ? 'active' : 'inactive'}
            type="button"
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
