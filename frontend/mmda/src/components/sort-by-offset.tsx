import { cn } from '@cads/shared/lib/utils'
import { Button } from '@cads/shared/components/ui/button'

export function SortByOffset({
  value,
  onChange,
  className,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={cn('flex flex-grow items-center gap-[1px]', className)}>
      {Offsets.map((offset) => (
        <Button
          key={offset}
          onClick={() => onChange(offset)}
          className="ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:hover:bg-background/50 flex grow flex-col items-center justify-center whitespace-nowrap rounded-sm px-0.5 py-1.5 text-center text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-80 data-[state=active]:shadow-sm"
          disabled={disabled}
          variant="secondary"
          data-state={offset === value ? 'active' : 'inactive'}
          size="sm"
        >
          {offset}
        </Button>
      ))}
    </div>
  )
}

const Offsets = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
