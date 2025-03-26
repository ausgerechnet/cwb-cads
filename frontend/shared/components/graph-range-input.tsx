import { useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '../lib/utils'
import { formatNumber } from '../lib/format-number'

interface DataPoint {
  value: number
  occurrences: number
}

function defaultRenderValue(value: number) {
  return formatNumber(value, true)
}

export default function GraphRangeInput({
  data = [],
  snapToData = true,
  renderValue = defaultRenderValue,
  initialMin,
  initialMax,
  onChange,
  className,
}: {
  data: DataPoint[]
  renderValue?: (value: number) => string
  snapToData?: boolean
  initialMin?: number
  initialMax?: number
  onChange?: (min: number, max: number) => void
  className?: string
}) {
  const minValue = data.length ? Math.min(...data.map((d) => d.value)) : 0
  const maxValue = data.length ? Math.max(...data.map((d) => d.value)) : 100
  const maxOccurrences = data.length
    ? Math.max(...data.map((d) => d.occurrences))
    : 0

  const [range, setRange] = useState(() => ({
    min: initialMin ?? minValue,
    max: initialMax ?? maxValue,
  }))

  const [activeDrag, setActiveDrag] = useState<'min' | 'max' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOccurrencesTotal = data.reduce(
    (acc, point) =>
      point.value >= range.min && point.value <= range.max
        ? acc + point.occurrences
        : acc,
    0,
  )

  const xAxisTicks = useMemo(() => {
    let tickCount = 5 // Default number of ticks
    const ticks: number[] = []
    for (let i = 0; i <= 5; i++) {
      const value = Math.round(
        minValue + (i / tickCount) * (maxValue - minValue),
      )
      ticks.push(value)
    }
    return ticks
  }, [data])

  const valueToPercent = (value: number) => {
    return ((value - minValue) / (maxValue - minValue)) * 100
  }

  const percentToValue = (percent: number) => {
    return minValue + (percent / 100) * (maxValue - minValue)
  }

  const handleMove = (clientX: number) => {
    if (!containerRef.current || !activeDrag) return

    const rect = containerRef.current.getBoundingClientRect()
    const percent = Math.min(
      Math.max(0, ((clientX - rect.left) / rect.width) * 100),
      100,
    )
    const newValue = Math.round(percentToValue(percent))

    const closestPoint = data.reduce((acc, point) => {
      return Math.abs(point.value - newValue) < Math.abs(acc.value - newValue)
        ? point
        : acc
    }, data[0])

    if (activeDrag === 'min') {
      setRange((prev) => {
        const min = snapToData ? closestPoint.value : newValue
        if (min > prev.max) return prev
        return { ...prev, min }
      })
    } else if (activeDrag === 'max') {
      setRange((prev) => {
        const max = snapToData ? closestPoint.value : newValue
        if (max < prev.min) return prev
        return { ...prev, max }
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX)
  const handleMouseUp = () => setActiveDrag(null)
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX)
    }
  }
  const handleTouchEnd = () => setActiveDrag(null)

  useEffect(() => {
    if (activeDrag) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [activeDrag])

  useEffect(() => {
    // prevent update while dragging
    if (onChange && !activeDrag) {
      onChange(range.min, range.max)
    }
  }, [range.min, range.max, onChange, activeDrag])

  return (
    <div
      className={cn(
        'my-3 grid w-full grid-cols-[max-content_1fr] gap-x-0.5 gap-y-1',
        className,
      )}
    >
      <div className="text-muted-foreground flex h-40 flex-col justify-between pr-2 text-xs leading-[0]">
        {[4, 3, 2, 1, 0].map((tick) => {
          const value = Math.round((tick / 4) * maxOccurrences)
          return (
            <div key={tick} className="ml-auto flex items-center text-right">
              {formatNumber(value, true)}
            </div>
          )
        })}
      </div>

      <div className="bg-muted/20 border-muted-foreground relative h-40 w-full flex-1 border-b">
        {[1, 2, 3, 4].map((tick) => (
          <div
            key={tick}
            className="bg-muted-foreground/20 absolute h-px w-full"
            style={{ bottom: `${(tick / 4) * 100}%` }}
          />
        ))}

        <div
          className="bg-primary/20 absolute bottom-0 h-full"
          style={{
            left: `${valueToPercent(range.min)}%`,
            width: `${valueToPercent(range.max) - valueToPercent(range.min)}%`,
          }}
          aria-hidden="true"
        />

        {data.map((point, index, { length }) => {
          const left = valueToPercent(point.value) / 100
          const height = (point.occurrences / maxOccurrences) * 100
          const isInRange = point.value >= range.min && point.value <= range.max

          return (
            <div
              key={index}
              className="group/bar absolute bottom-0 z-10 h-full hover:z-20 hover:bg-black/10 dark:hover:bg-white/10"
              style={{
                left: `calc(var(--position) * (100% - var(--width)))`,
                width: 'var(--width)',
                ['--width' as string]: `clamp(3px, calc(${100 / length}%), 4px)`,
                ['--position' as string]: left,
              }}
              aria-hidden="true"
            >
              <div
                className={cn(
                  'absolute bottom-0 left-0 w-full rounded-t-sm',
                  isInRange
                    ? 'bg-primary group-hover/bar:bg-blue-900 dark:group-hover/bar:bg-blue-300'
                    : 'group-hover/bar:bg-primary bg-gray-600 dark:bg-gray-400',
                )}
                style={{ height: `${height}%` }}
              />
              <div className="bg-background pointer-events-none absolute bottom-full whitespace-nowrap rounded-md p-1 text-xs opacity-0 shadow group-hover/bar:opacity-100">
                {renderValue(point.value)}
                <br />
                {formatNumber(point.occurrences, true)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="col-span-1"></div>
      <div className="text-muted-foreground relative mt-1 flex justify-between text-xs">
        {xAxisTicks.map((tick, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 transform"
            style={{ left: `${valueToPercent(tick)}%` }}
          >
            {renderValue(tick)}
          </div>
        ))}
      </div>

      {/* Slider -- extract into its own component if needed */}
      <div
        ref={containerRef}
        className="relative col-start-2 mt-3 h-12 w-full touch-none"
        role="group"
        aria-labelledby="range-slider-label"
      >
        <div id="range-slider-label" className="sr-only">
          Numeric range selector
        </div>

        <div className="bg-muted absolute top-5 h-2 w-full rounded-full">
          <div
            className="bg-primary absolute h-full rounded-full"
            style={{
              left: `${valueToPercent(range.min)}%`,
              width: `${valueToPercent(range.max) - valueToPercent(range.min)}%`,
            }}
            aria-hidden="true"
          />
        </div>

        <button
          type="button"
          className="bg-background border-primary focus:ring-primary focus:ring-offset-background absolute top-3 -ml-3 h-6 w-6 rounded-full border-2 shadow focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ left: `${valueToPercent(range.min)}%` }}
          onMouseDown={() => setActiveDrag('min')}
          onTouchStart={() => setActiveDrag('min')}
          aria-label={`Set minimum value, currently ${range.min}`}
          aria-valuemin={minValue}
          aria-valuemax={range.max}
          aria-valuenow={range.min}
          role="slider"
        />

        <button
          type="button"
          className="bg-background border-primary focus:ring-primary focus:ring-offset-background absolute top-3 -ml-3 h-6 w-6 rounded-full border-2 shadow focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{ left: `${valueToPercent(range.max)}%` }}
          onMouseDown={() => setActiveDrag('max')}
          onTouchStart={() => setActiveDrag('max')}
          aria-label={`Set maximum value, currently ${range.max}`}
          aria-valuemin={range.min}
          aria-valuemax={maxValue}
          aria-valuenow={range.max}
          role="slider"
        />
      </div>

      <div className="col-start-2 w-full text-sm">
        {renderValue(range.min)} - {renderValue(range.max)}
        <br />
        {formatNumber(selectedOccurrencesTotal, true)}
      </div>
    </div>
  )
}
