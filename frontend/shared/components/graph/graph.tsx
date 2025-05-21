import { useState, useMemo, Fragment, type ReactNode, memo } from 'react'

import { cn } from '@cads/shared/lib/utils'
import { clamp } from '@cads/shared/lib/clamp'
import { formatNumber } from '@cads/shared/lib/format-number'
import { createPoint, pathToSvgPath, pointsToCatmullRom } from './geometry'
import { useViewport } from './use-viewport'

type DataPoint = {
  position: [number, number]
  label?: string
  className?: string
}

export function Graph<T extends number | [number, number]>({
  value,
  onChange,
  dataPoints,
  pointStyle = 'circle',
  viewportX,
  viewportY,
  bands,
  lines,
  className,
  hideLegend = false,
  formatY = formatNumber,
  XAxisComponent = XAxis,
}: {
  value?: T
  onChange?: (position: [number, number], label?: string) => void
  dataPoints?: DataPoint[]
  pointStyle?: 'circle' | 'bar'
  viewportX?: [number, number]
  viewportY?: [number, number] | [number]
  bands?: { points: [number, [number, number]][]; className?: string }[] // [x, [y_lower, y_upper]] band coordiante
  lines?: [number, number][][]
  className?: string
  hideLegend?: boolean
  formatY?: (value: number) => string
  XAxisComponent?: (props: XAxisProps) => ReactNode
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const {
    minX,
    maxX,
    minY,
    barWidth,
    viewboxX,
    viewboxY,
    viewboxWidth,
    viewboxHeight,
    flipY,
    valueRangeY,
    hasData,
  } = useViewport(dataPoints, bands, lines, viewportX, viewportY, pointStyle)

  const yTickMin = useMemo(
    () => clamp(minY, viewboxY, pointStyle === 'bar' ? 0 : Infinity),
    [minY, viewboxY, pointStyle],
  )
  const yTickMax = useMemo(
    () => Math.min(minY + valueRangeY, viewboxY + viewboxHeight),
    [minY, valueRangeY, viewboxY, viewboxHeight],
  )
  /**
   * Used to determine the width of the legend and prevent overlap
   **/
  const maxCharactersInValue = useMemo(
    () =>
      Math.max(
        0,
        ...(dataPoints ?? [{ position: [0, 0] }])
          .map(({ position: [_, y] }) => formatY(y).length)
          .filter((value) => !isNaN(value)),
      ),
    [dataPoints],
  )

  const yTickValues = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => {
        const y = (index / 4) * (yTickMax - yTickMin) + yTickMin
        return {
          value: y,
          label: y.toFixed(2),
        }
      }),
    [yTickMin, yTickMax],
  )

  const pointsWithinViewport = useMemo(
    () =>
      dataPoints?.filter(
        ({ position: [x] }) => x >= viewboxX && x <= viewboxX + viewboxWidth,
      ),
    [dataPoints, viewboxX, viewboxWidth],
  )

  const highlightPoint =
    hoverIndex === null ? null : (dataPoints?.[hoverIndex] ?? null)

  return (
    <div
      className={cn(
        'bg-muted group/graph grid h-44 w-full grid-cols-[minmax(var(--col-1-min,0),var(--col-1))_1fr] grid-rows-[1fr_min-content]',
        className,
      )}
      style={{
        ['--col-1' as string]: hideLegend ? '0px' : 'auto',
        ['--col-1-min' as string]: hideLegend
          ? '0px'
          : `${maxCharactersInValue}ex`,
      }}
    >
      <aside className="relative grid group-has-[button:hover]/graph:opacity-10">
        {!hideLegend &&
          hasData &&
          yTickValues.map(({ value }, index) => {
            const estLabelHeight = '16px'
            const top = `clamp(1px, calc(${((flipY(value) - viewboxY) / viewboxHeight) * 100}% - ${estLabelHeight} / 2), calc(100% - ${estLabelHeight}))`
            return (
              <span
                className="text-muted-foreground relative col-start-1 row-start-1 ml-auto mr-0 block h-min pl-2 pr-4 font-mono text-xs"
                key={index}
                style={{ top }}
              >
                {formatY(value)}
              </span>
            )
          })}
      </aside>

      <div className="relative">
        {/* Instead of calculating the flipped y coordinate, we just mirror the svg */}
        <GraphSVGMemo
          viewboxX={viewboxX}
          viewboxY={viewboxY}
          viewboxWidth={viewboxWidth}
          viewboxHeight={viewboxHeight}
          yTickValues={yTickValues}
          lines={lines}
          bands={bands}
          hideLegend={hideLegend}
          barWidth={barWidth}
          value={value}
        />
        <div className="absolute inset-0">
          <DataPointsMemo
            onChange={onChange}
            dataPoints={dataPoints}
            value={value as T | undefined}
            pointStyle={pointStyle}
            viewboxX={viewboxX}
            viewboxY={viewboxY}
            viewboxWidth={viewboxWidth}
            viewboxHeight={viewboxHeight}
            flipY={flipY}
            barWidth={barWidth}
            setHoverIndex={setHoverIndex}
            formatY={formatY}
            hideLegend={hideLegend}
          />
        </div>
      </div>

      {!hideLegend && (
        <XAxisComponent
          pointsWithinViewport={pointsWithinViewport ?? []}
          highlightPoint={highlightPoint}
          viewboxX={viewboxX}
          viewboxWidth={viewboxWidth}
          minX={minX}
          maxX={maxX}
        />
      )}
    </div>
  )
}

const DataPointsMemo = memo(DataPoints)

function DataPoints({
  dataPoints,
  value,
  onChange,
  pointStyle,
  viewboxX,
  viewboxY,
  viewboxWidth,
  viewboxHeight,
  flipY,
  barWidth,
  setHoverIndex,
  formatY,
  hideLegend,
}: {
  dataPoints?: DataPoint[]
  value?: number | [number, number]
  onChange?: (position: [number, number], label?: string) => void
  pointStyle: 'circle' | 'bar'
  viewboxX: number
  viewboxY: number
  viewboxWidth: number
  viewboxHeight: number
  flipY: (y: number) => number
  barWidth: number
  setHoverIndex: (index: number | null) => void
  formatY: (value: number) => string
  hideLegend?: boolean
}) {
  return (
    <>
      {dataPoints?.map(({ position, label, className }, index) => {
        const [x, y] = position
        if (x < viewboxX || x > viewboxWidth + viewboxX) return null
        const left = `${((x - viewboxX) / viewboxWidth) * 100}%`
        const top = `${((flipY(y) - viewboxY) / viewboxHeight) * 100}%`

        const isSelected = Array.isArray(value)
          ? value[0] <= x && (value?.[1] ?? Infinity) >= x
          : value === x

        const scaledBarWidth = (barWidth / viewboxWidth) * 100
        // rounding up prevents rendering issues in Firefox that shift the bar slightly along the y axis
        const relativeHeight = Math.ceil((y / viewboxHeight) * 100)
        const bottom = `${-viewboxY / viewboxHeight}%`

        return (
          <Fragment key={index}>
            <button
              className={cn(
                'absolute bottom-0 h-full w-5 -translate-x-1/2 [&:hover+span+svg+span]:opacity-100 [&:hover+span+svg]:opacity-100 [&:hover+span]:z-10 [&:hover+span]:opacity-100',
                pointStyle === 'circle' &&
                  '[&:hover+span[aria-selected=false]]:scale-150',
                pointStyle === 'bar' &&
                  'min-w-1 [&:hover+span[aria-selected=true]]:bg-blue-200 [&:hover+span]:bg-blue-700',
              )}
              onClick={() => {
                onChange?.(position, label)
              }}
              onMouseOver={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{
                left,
                width: pointStyle === 'bar' ? `${scaledBarWidth}%` : undefined,
              }}
            />

            <span
              className={cn(
                'pointer-events-none absolute',
                hideLegend && 'bg-primary h-1 outline-0',
                pointStyle === 'circle' &&
                  'bg-primary aria-selected:outline-primary/50 aspect-square h-2 -translate-x-1/2 -translate-y-1/2 rounded-full outline outline-2 outline-white aria-selected:h-3 aria-selected:bg-white aria-selected:outline-8',
                pointStyle === 'circle' &&
                  hideLegend &&
                  'h-1 outline-1 aria-selected:h-2 aria-selected:outline-4',
                pointStyle === 'bar' &&
                  'bg-accent-foreground aria-selected:bg-primary min-w-1 -translate-x-1/2 rounded-t-sm',
                pointStyle === 'bar' && scaledBarWidth < 0.5 && 'rounded-none',
                className,
              )}
              aria-selected={isSelected}
              style={{
                left,
                bottom,
                top: pointStyle === 'circle' ? top : undefined,
                width: pointStyle === 'bar' ? `${scaledBarWidth}%` : undefined,
                height: pointStyle === 'bar' ? `${relativeHeight}%` : undefined,
              }}
            />

            {!hideLegend && (
              <svg
                viewBox="0 0 100 2"
                className="pointer-events-none absolute left-0 h-3 w-full opacity-0"
                preserveAspectRatio="none"
                style={{ top }}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={100}
                  y2={0}
                  className="stroke-foreground opacity-80"
                  strokeLinecap="round"
                  strokeWidth={2}
                  strokeDasharray="8 8"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}

            {!hideLegend && (
              <span
                className="text-foreground absolute right-[calc(100%+1rem)] -translate-y-1/2 whitespace-nowrap font-mono text-xs opacity-0"
                style={{ top }}
              >
                {formatY(y)}
              </span>
            )}
          </Fragment>
        )
      })}
    </>
  )
}

const GraphSVGMemo = memo(GraphSVG)

function GraphSVG({
  viewboxX = 0,
  viewboxY = 0,
  viewboxWidth = 1,
  viewboxHeight = 1,
  yTickValues,
  lines,
  bands,
  hideLegend,
  value,
  barWidth = 0,
}: {
  viewboxX?: number
  viewboxY?: number
  viewboxWidth?: number
  viewboxHeight?: number
  yTickValues: { value: number; label: string }[]
  lines?: [number, number][][]
  bands?: { points: [number, [number, number]][]; className?: string }[]
  hideLegend?: boolean
  value?: [number, number] | number
  barWidth?: number
}) {
  return (
    <svg
      viewBox={`${viewboxX} ${viewboxY} ${viewboxWidth} ${viewboxHeight}`}
      className="absolute block h-full w-full -scale-y-100 will-change-transform"
      preserveAspectRatio="none"
    >
      {Array.isArray(value) && (
        <rect
          x={value[0] - barWidth / 2}
          y={viewboxY}
          width={value[1] - value[0] + barWidth}
          height={viewboxHeight}
          className="fill-primary/15"
        />
      )}

      {!hideLegend && (
        <g>
          {/* Warning: using  a <line> will come with unexpected behavior when the line starts at x < 0 and is too long */}
          {yTickValues.map(({ value }, index) => (
            <path
              d={`M${viewboxX} ${value} L${viewboxX + viewboxWidth} ${value}`}
              key={index}
              className="stroke-muted-foreground opacity-50"
              strokeWidth={0.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line
            x1={viewboxX}
            y1={0}
            x2={viewboxX + viewboxWidth}
            y2={0}
            className="stroke-foreground stroke-[1px] opacity-50"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}

      {bands?.map((band, index) => <Band {...band} key={index} />)}

      {lines?.map((line, index) => <Line points={line} key={index} />)}

      {typeof value === 'number' && (
        <line
          x1={value}
          y1={viewboxY}
          x2={value}
          y2={viewboxY + viewboxHeight}
          className="stroke-green-500/50"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

export type XAxisProps = {
  pointsWithinViewport: DataPoint[]
  highlightPoint: DataPoint | null
  viewboxX: number
  viewboxWidth: number
  minX: number
  maxX: number
}

function XAxis({
  pointsWithinViewport,
  highlightPoint,
  viewboxX,
  viewboxWidth,
}: XAxisProps) {
  return (
    <aside className="text-muted-foreground relative col-start-2 flex h-6 justify-between pt-2 font-mono text-xs leading-none">
      {pointsWithinViewport?.map(({ position: [x], label }, index) => {
        const itemsPerViewport = 15
        // filter out all points except every nth item
        if (
          index % Math.ceil(pointsWithinViewport.length / itemsPerViewport) !==
            0 &&
          index !== pointsWithinViewport.length - 1 &&
          pointsWithinViewport.length > 6
        ) {
          return null
        }
        const left = ((x - viewboxX) / viewboxWidth) * 100
        return (
          <span
            key={index}
            className={cn(
              'absolute transition-opacity',
              highlightPoint !== null && 'opacity-10',
            )}
            style={{
              left: `${left}%`,
              translate:
                index === 0
                  ? undefined
                  : index === pointsWithinViewport.length - 1
                    ? '-100% 0'
                    : '-50% 0',
            }}
          >
            {label ? label : x}
          </span>
        )
      })}

      {highlightPoint && (
        <span
          className="text-foreground absolute"
          style={{
            left: `${((highlightPoint.position[0] - viewboxX) / viewboxWidth) * 100}%`,
            translate: '-50% 0',
          }}
        >
          {highlightPoint.label
            ? highlightPoint.label
            : formatNumber(highlightPoint.position[0])}
        </span>
      )}
    </aside>
  )
}

export function XAxisVertical({
  pointsWithinViewport,
  highlightPoint,
  viewboxX,
  viewboxWidth,
}: XAxisProps) {
  const itemsPerViewport = 90
  return (
    <aside className="text-muted-foreground relative col-start-2 grid grid-cols-1 place-content-start place-items-start justify-between py-2 font-mono text-xs leading-none">
      {pointsWithinViewport?.map(({ position: [x], label }, index) => {
        if (
          index % Math.ceil(pointsWithinViewport.length / itemsPerViewport) !==
            0 &&
          index !== pointsWithinViewport.length - 1 &&
          pointsWithinViewport.length > 6
        ) {
          return null
        }
        const left = ((x - viewboxX) / viewboxWidth) * 100
        return (
          <span
            key={index}
            className={cn(
              'relative col-start-1 row-start-1 block max-h-36 overflow-hidden text-ellipsis whitespace-nowrap transition-opacity [writing-mode:vertical-lr]',
              highlightPoint !== null && 'opacity-10',
            )}
            style={{
              left: `${left}%`,
              translate: '-50% 0',
            }}
          >
            {label ? label : x}
          </span>
        )
      })}

      {highlightPoint && (
        <span
          className="text-foreground bg-background/50 absolute z-10 col-start-1 row-start-1 place-items-start [writing-mode:vertical-lr]"
          style={{
            left: `${((highlightPoint.position[0] - viewboxX) / viewboxWidth) * 100}%`,
            translate: '-50% 0',
          }}
        >
          {highlightPoint.label
            ? highlightPoint.label
            : formatNumber(highlightPoint.position[0])}
        </span>
      )}
    </aside>
  )
}

function Line({ points }: { points: [number, number][] }) {
  const d = useMemo(
    () =>
      pathToSvgPath(
        pointsToCatmullRom(
          points.map(([x, y]) => createPoint(x, y)),
          {
            tension: 0.5,
            divisions: clamp(points.length * 2, 5, 200),
            closed: false,
          },
        ),
      ),
    [points],
  )

  return (
    <path
      d={d}
      className="stroke-primary fill-transparent stroke-2"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function Band({
  points,
  className,
}: {
  points: [number, [number, number]][]
  className?: string
}) {
  'use no memo'
  const d = useMemo(() => {
    const upperPoints = points.map(([x, [y]]) => createPoint(x, y))
    const lowerPoints = points.map(([x, [, y]]) => createPoint(x, y))
    lowerPoints.reverse()
    const path = [
      ...pointsToCatmullRom(upperPoints, {
        tension: 0.5,
        divisions: Math.max(50, points.length * 2),
        closed: false,
      }),
      ...pointsToCatmullRom(lowerPoints, {
        tension: 0.5,
        divisions: Math.max(50, points.length * 2),
        closed: false,
      }),
    ]
    return pathToSvgPath(path)
  }, [points])

  return <path d={d} className={cn('fill-primary/20', className)} />
}
