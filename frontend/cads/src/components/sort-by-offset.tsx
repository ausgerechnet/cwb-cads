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
    <div className={cn('flex items-center', className)}>
      {Offsets.map((offset) => (
        <Button
          key={offset}
          onClick={() => onChange(offset)}
          className="flex-grow rounded-none p-1 text-sm first:rounded-bl-md first:rounded-tl-md last:rounded-br-md last:rounded-tr-md"
          disabled={disabled}
          variant={offset === value ? 'default' : 'secondary'}
          size="sm"
        >
          {offset}
        </Button>
      ))}
    </div>
  )
}

const Offsets = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
