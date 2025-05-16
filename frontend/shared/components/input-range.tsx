import { Root, Track, Thumb } from '@radix-ui/react-slider'
import { cn } from '../lib/utils'

export function InputRange({
  className,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  className?: string
  min: number
  max: number
  step?: number
  onChange?: (value: [number, number]) => void
  value: [number, number]
}) {
  const minValue = Math.min(value[0], value[1])
  const maxValue = Math.max(value[0], value[1])
  const numberRange = max - min

  return (
    <div className={cn('relative h-8 cursor-pointer', className)}>
      <Root
        className="user-select-none absolute flex h-8 w-full touch-none items-center"
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
      >
        <Track className="relative h-full w-full">
          <div className="bg-muted-foreground absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full" />
          <div
            className="bg-primary absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 rounded-full"
            style={{
              left: `${(Math.abs(minValue - min) / numberRange) * 100}%`,
              width: `${(Math.abs(maxValue - minValue) / numberRange) * 100}%`,
            }}
          />
        </Track>

        <Thumb className="bg-primary block h-4 w-4 rounded-full" />

        <Thumb className="bg-primary block h-4 w-4 rounded-full" />
      </Root>
    </div>
  )
}
