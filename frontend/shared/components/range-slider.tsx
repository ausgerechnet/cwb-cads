import { Root, Track, Thumb } from '@radix-ui/react-slider'
import { cn } from '../lib/utils'

export function RangeSlider({
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
    <Root
      className={cn(
        'relative flex h-10 w-full cursor-pointer touch-none select-none items-center',
        className,
      )}
      value={value}
      onValueChange={onChange}
      min={min}
      max={max}
      step={step}
    >
      <Track className="relative h-2 w-full grow overflow-hidden rounded-full">
        <div className="bg-muted-foreground absolute top-1/2 h-full w-full -translate-y-1/2 rounded-full" />
        <div
          className="bg-primary absolute left-0 top-1/2 h-full w-full -translate-y-1/2 rounded-full"
          style={{
            left: `${(Math.abs(minValue - min) / numberRange) * 100}%`,
            width: `${(Math.abs(maxValue - minValue) / numberRange) * 100}%`,
          }}
        />
      </Track>

      <Thumb className="border-primary bg-background ring-offset-background focus-visible:ring-ring block h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />

      <Thumb className="border-primary bg-background ring-offset-background focus-visible:ring-ring block h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </Root>
  )
}
