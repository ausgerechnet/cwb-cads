import { useEffect, useMemo, useRef, useState } from 'react'

import { clamp } from '@cads/shared/lib/clamp'
import { cn } from '@cads/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'

export function TimeSeries({
  className,
  value,
  data,
  onChange,
  zoom,
}: {
  className?: string
  value?: string
  onChange?: (value: string) => void
  data: {
    score?: number // 0-1
    label?: string
    median: number
    confidence90: [number, number]
    confidence95: [number, number]
  }[]
  zoom?: boolean
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [svgWidth, setSvgWidth] = useState(100)
  const [hoveredLabel, setHoveredLabel] = useState<string | undefined>(value)

  const [minValue, maxValue] = useMemo(() => {
    const allValues = data
      .map((d) => [d.median, ...d.confidence90, ...d.confidence95, d.score])
      .flat()
      .filter((d): d is number => typeof d === 'number' && !isNaN(d))
    return [Math.min(...allValues), Math.max(...allValues)]
  }, [data])

  const valueRange = maxValue - minValue
  const minY = zoom ? minValue - 0.1 * valueRange : 0
  const maxY = zoom ? maxValue + 0.1 * valueRange : 1
  const viewportHeight = Math.abs(maxY - minY)
  const xStep = 100 / (data.length - 1)
  const scaleX = 100 / svgWidth
  const scaleY = (maxY - minY) * 0.65 // magic number :-/
  const maxWidth = svgWidth / data.length

  let gridResolution = 0.2
  if (viewportHeight < 0.5) gridResolution = 0.05
  if (viewportHeight < 0.2) gridResolution = 0.01
  const hoveredDataPoint = data.find((d) => d.label === hoveredLabel)
  const textX = -35 * scaleX

  useEffect(() => {
    const svgElement = svgRef.current
    if (svgElement === null) return
    const updateWidth = () => {
      const { width } = svgElement.getBoundingClientRect()
      setSvgWidth(width)
    }
    const observer = new ResizeObserver(() => void updateWidth())
    observer.observe(svgElement)
    updateWidth()
    return () => void observer.disconnect()
  }, [svgRef])

  return (
    <div
      className={cn(
        'border-1 border-border bg-muted grid grid-cols-[4rem_1fr_3rem] grid-rows-[10rem] overflow-hidden rounded-lg border',
        className,
      )}
    >
      <aside aria-label="Y-axis labels" className="w-32"></aside>

      <div className="relative flex">
        <svg
          viewBox={`0 ${(1 - maxY) * 100} 100 ${viewportHeight * 100}`}
          preserveAspectRatio="none"
          className={cn(
            'absolute left-0 top-0 h-full w-full overflow-visible',
            data.length === 0 && 'opacity-0',
          )}
          ref={svgRef}
        >
          <g aria-label="Grid lines">
            {Array.from({ length: 1 / gridResolution + 1 }).map((_, index) => {
              const textY = index * 100 * gridResolution
              let label = (1 - index * gridResolution).toFixed(2)
              if (label.startsWith('0')) label = label.slice(1)
              return (
                <g key={index}>
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="end"
                    className="fill-muted-foreground font-mono text-xs"
                    opacity={hoveredDataPoint ? 0.1 : 1}
                    style={{
                      transformOrigin: `${textX}px ${textY}px`,
                      scale: `${scaleX} ${scaleY}`,
                    }}
                  >
                    {label}
                  </text>

                  <line
                    vectorEffect="non-scaling-stroke"
                    x1={-20 * scaleX}
                    x2={100}
                    y1={index * (100 * gridResolution)}
                    y2={index * (100 * gridResolution)}
                    className="stroke-slate-500 stroke-[1px] opacity-20 dark:stroke-slate-400"
                  />
                </g>
              )
            })}
          </g>

          <path
            className="fill-slate-300 stroke-none dark:fill-slate-700"
            d={getBandPath(data.map((d) => d.confidence95))}
          />

          <path
            className="fill-slate-400 stroke-none dark:fill-slate-600"
            d={getBandPath(data.map((d) => d.confidence90))}
          />

          <path
            vectorEffect="non-scaling-stroke"
            className="stroke-primary fill-transparent stroke-[2px]"
            d={pathToSvgPath(
              pointsToCatmullRom(
                data.map(({ median }, index) =>
                  p(xStep * index, (1 - median) * 100),
                ),
                {
                  tension: 0.5,
                  divisions: Math.max(150, data.length * 2),
                  closed: false,
                },
              ),
            )}
          />

          {hoveredDataPoint && (
            <g>
              <text
                x={textX}
                y={(1 - hoveredDataPoint.score!) * 100}
                textAnchor="end"
                className="fill-foreground bg-black font-mono text-xs"
                style={{
                  transformOrigin: `${textX}px ${(1 - hoveredDataPoint.score!) * 100}px`,
                  scale: `${scaleX} ${scaleY}`,
                }}
              >
                {hoveredDataPoint.score === undefined
                  ? 'n.a.'
                  : Math.round(hoveredDataPoint.score * 100) / 100}
              </text>

              <line
                vectorEffect="non-scaling-stroke"
                strokeDasharray="10 5"
                x1={-20 * scaleX}
                x2={100}
                y1={(1 - hoveredDataPoint.score!) * 100}
                y2={(1 - hoveredDataPoint.score!) * 100}
                className="stroke-foreground stroke-1"
              />
            </g>
          )}

          <g aria-label="data points">
            {data.map((dataPoint, index) => (
              <DataPoint
                key={index}
                x={xStep * index}
                scaleX={scaleX}
                scaleY={scaleY}
                value={value}
                maxWidth={maxWidth}
                onChange={onChange}
                onMouseOver={setHoveredLabel}
                onMouseOut={(outLabel) =>
                  setHoveredLabel((label) =>
                    label === outLabel ? undefined : label,
                  )
                }
                {...dataPoint}
              />
            ))}
          </g>
        </svg>
      </div>

      <aside
        className="bg-muted relative col-start-2"
        aria-label="X-axis labels"
      >
        <svg className="fill-foreground relative h-8 w-full overflow-visible">
          {data.map((dataPoint, index) => {
            const label = dataPoint.label
            const steps = Math.floor(data.length / 5)
            const isHighlight = label === value || hoveredLabel === label
            const isVisibleStep =
              index === 0 || index % steps === 0 || index === data.length - 1
            const isVisible =
              isHighlight || (hoveredLabel === undefined && isVisibleStep)

            return (
              <text
                key={label}
                className={cn(
                  !isVisible && 'fill-transparent transition-all',
                  isHighlight && 'fill-primary',
                  !isHighlight && hoveredLabel && 'opacity-50',
                )}
                textAnchor="middle"
                x={`${index * xStep}%`}
                y={10}
                fontSize={12}
              >
                {label}
              </text>
            )
          })}
        </svg>
      </aside>

      <div className="bg-muted relative col-span-full col-start-1 pt-2">
        <Select
          value={value}
          onValueChange={onChange}
          disabled={
            !onChange ||
            data.every((d) => d.label === undefined || d.score === undefined)
          }
        >
          <SelectTrigger className="mx-2 mb-2 w-auto">
            <SelectValue placeholder="Select Entry" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              {data.map(({ label, score }) =>
                label === undefined || score === undefined ? null : (
                  <SelectItem key={label} value={label}>
                    {label}: {score}
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function DataPoint({
  score,
  label,
  x,
  scaleX,
  scaleY,
  value,
  maxWidth,
  onChange,
  onMouseOver,
  onMouseOut,
}: {
  score?: number | undefined
  label?: string | undefined
  x: number
  scaleX: number
  scaleY: number
  value?: string
  maxWidth: number
  onChange?: (value: string) => void
  onMouseOver?: (value: string) => void
  onMouseOut?: (value: string) => void
}) {
  if (score === undefined) return null
  const isActive = label === value
  const touchWidth = Math.min(maxWidth, 32)

  return (
    <g className="cursor-pointer">
      <rect
        x={x - touchWidth / 2}
        y={-100}
        width={touchWidth}
        height={300}
        className="peer fill-transparent"
        style={{
          transformOrigin: `${x}px ${(1 - score) * 100}px`,
          scale: `${scaleX} 1`,
        }}
        onClick={() => label && onChange?.(label)}
        onMouseOver={() => label && onMouseOver?.(label)}
        onMouseOut={() => label && onMouseOut?.(label)}
      />

      <circle
        cx={x}
        cy={(1 - score) * 100}
        r={isActive ? 12 : 5}
        className={cn(
          'fill-primary opacity-0 transition-all',
          isActive && 'opacity-30',
        )}
        style={{
          transformOrigin: `${x}px ${(1 - score) * 100}px`,
          scale: `${scaleX} ${scaleY}`,
        }}
      />

      <circle
        cx={x}
        cy={(1 - score) * 100}
        r={isActive ? 6 : 5}
        strokeWidth={2}
        className={cn(
          'fill-primary peer-hover:stroke-primary pointer-events-none stroke-white peer-hover:fill-white',
          isActive && 'stroke-primary dark:stroke-primary fill-white',
        )}
        style={{
          transformOrigin: `${x}px ${(1 - score) * 100}px`,
          scale: `${scaleX} ${scaleY}`,
        }}
      />
    </g>
  )
}

function getBandPath(band: [number, number][]) {
  const xStep = 100 / (band.length - 1)

  const topPoints = band.map(([, top], index) =>
    p(xStep * index, (1 - top) * 100),
  )

  const bottomPoints = band
    .map(([bottom], index) => p(xStep * index, (1 - bottom) * 100))
    .toReversed()

  const splineConfig = {
    tension: 0.5,
    divisions: Math.max(50, band.length * 2),
    closed: false,
  } as const

  const path = [
    ...pointsToCatmullRom(topPoints, splineConfig),
    ...pointsToCatmullRom(bottomPoints, splineConfig),
  ]

  return pathToSvgPath(path)
}

type Point = {
  type: 'point'
  x: number
  y: number
}

type Line = {
  type: 'line'
  origin: Point
  end: Point
}

type AnyGeometry = Point | Line

type Path = AnyGeometry[]

type CatmullRomType = 'centripetal' | 'uniform' | 'chordal'
const catmullRomType: Record<CatmullRomType, number> = {
  centripetal: 0.5,
  uniform: 0,
  chordal: 1,
}

type CatmullRomSpline = [Point, Point, Point, Point]
type CatmullRomSegment = [Point, Point, Point, Point]

function pathToSvgPath(path: Path): string {
  return groupWith(areSameGeometryType, path)
    .map((pathElements: AnyGeometry[]) => {
      if (isPointArray(pathElements)) {
        return pointsToSvgPath(pathElements)
      }
      if (isLineArray(pathElements)) {
        return pointsToSvgPath(linesToPoints(pathElements))
      }
    })
    .join(' ')
}

function isGeometry<T extends AnyGeometry>(type: AnyGeometry['type']) {
  return (geometry: AnyGeometry | unknown): geometry is T =>
    (geometry as AnyGeometry)?.type === type
}

function isGeometryArray<T extends AnyGeometry>(
  checkFunction: (geometry: AnyGeometry | undefined) => boolean,
) {
  return (geometry: AnyGeometry[]): geometry is T[] =>
    geometry.reduce(
      (allEqual, geometry) => allEqual && checkFunction(geometry),
      true,
    )
}

const isPoint = isGeometry<Point>('point')
const isPointArray = isGeometryArray<Point>(isPoint)
const isLine = isGeometry<Line>('line')
const isLineArray = isGeometryArray<Line>(isLine)

function linesToPoints(lines: Line[]): Point[] {
  const points: Point[] = []
  const pushIfNew = (point: Point) => {
    if (
      points.length === 0 ||
      !pointsAreEqual(points[points.length - 1], point)
    ) {
      points.push(point)
    }
  }
  for (let i = 0, l = lines.length; i < l; i++) {
    pushIfNew(lines[i].origin)
    pushIfNew(lines[i].end)
  }
  return points
}

function areSameGeometryType(a: AnyGeometry, b: AnyGeometry) {
  return a.type === b.type
}

function pointsToSvgPath(points: Point[], lineTo = false) {
  return points
    .map(({ x, y }, index) => {
      const command = index === 0 && !lineTo ? 'M' : 'L'
      return `${command} ${x} ${y}`
    })
    .join(' ')
}

function groupWith<T>(fn: (a: T, b: T) => boolean, list: T[]): T[][] {
  const res = []
  let idx = 0
  const len = list.length
  while (idx < len) {
    let nextidx = idx + 1
    while (nextidx < len && fn(list[nextidx - 1], list[nextidx])) {
      nextidx += 1
    }
    res.push(list.slice(idx, nextidx))
    idx = nextidx
  }
  return res
}

function createPoint(x: number, y: number): Point {
  return {
    type: 'point',
    x,
    y,
  }
}

const p = createPoint

function createLine(
  a: Point | number,
  b: Point | number,
  x2?: number,
  y2?: number,
): Line
function createLine(
  a: Point | number,
  b: Point | number,
  x2?: number,
  y2?: number,
) {
  const { origin, end } =
    isPoint(a) && isPoint(b)
      ? { origin: a, end: b }
      : {
          origin: createPoint(a as number, b as number),
          end: createPoint(x2 as number, y2 as number),
        }
  return { type: 'line', origin, end }
}

function getSegmentPoint([a, b, c, d]: CatmullRomSegment, t: number) {
  return createPoint(
    a.x * t * t * t + b.x * t * t + c.x * t + d.x,
    a.y * t * t * t + b.y * t * t + c.y * t + d.y,
  )
}

function getSegmentTangent(segment: CatmullRomSegment, t: number) {
  const delta = 0.0000001
  const prev = getSegmentPoint(segment, t - (t < 0.5 ? 0 : delta))
  const next = getSegmentPoint(segment, t + (t >= 0.5 ? 0 : delta))
  return getAngleOfLineInRadians(createLine(prev, next))
}

function getAngleOfLineInRadians(line: Line): number {
  return noRevolutionsRad(angleInRadians(line.origin, line.end))
}

function angleInRadians(origin: Point, pointToFindAngle: Point): number {
  const d = subtractFromPoint(pointToFindAngle, origin)
  const { x, y } = d
  return Math.atan2(-y, -x) + Math.PI
}

function noRevolutionsRad(angleInRads: number) {
  const revolutions = Math.floor(angleInRads / (Math.PI * 2))
  if (revolutions === 0) return angleInRads
  return angleInRads - Math.PI * 2 * revolutions
}

function subtractFromPoint(point: Point, subtraction: Point) {
  return p(point.x - subtraction.x, point.y - subtraction.y)
}

function getCatmullRomSegment(
  [p0, p1, p2, p3]: CatmullRomSpline,
  type: CatmullRomType = 'centripetal',
  tension = 0.5,
): [Point, Point, Point, Point] {
  const alpha = catmullRomType[type]
  const t01 = Math.pow(lineLength([p0, p1]), alpha)
  const t12 = Math.pow(lineLength([p1, p2]), alpha)
  const t23 = Math.pow(lineLength([p2, p3]), alpha)

  const m1 = createPoint(
    (1 - tension) *
      (p2.x - p1.x + t12 * ((p1.x - p0.x) / t01 - (p2.x - p0.x) / (t01 + t12))),
    (1 - tension) *
      (p2.y - p1.y + t12 * ((p1.y - p0.y) / t01 - (p2.y - p0.y) / (t01 + t12))),
  )
  const m2 = createPoint(
    (1 - tension) *
      (p2.x - p1.x + t12 * ((p3.x - p2.x) / t23 - (p3.x - p1.x) / (t12 + t23))),
    (1 - tension) *
      (p2.y - p1.y + t12 * ((p3.y - p2.y) / t23 - (p3.y - p1.y) / (t12 + t23))),
  )

  const a: Point = createPoint(
    2 * (p1.x - p2.x) + m1.x + m2.x,
    2 * (p1.y - p2.y) + m1.y + m2.y,
  )
  const b: Point = createPoint(
    -3 * (p1.x - p2.x) - m1.x - m1.x - m2.x,
    -3 * (p1.y - p2.y) - m1.y - m1.y - m2.y,
  )

  return [a, b, m1, p1]
}

function linearSpace(start: number, stop: number, num: number): number[] {
  const interval = Math.abs(stop - start) / (num - 1)
  return Array.from({ length: num }, (_, index) => start + index * interval)
}

function pointsToCatmullRom(
  points: Point[],
  {
    tension = 0.1,
    divisions,
    divisionsPerUnit,
    offset = 0,
    closed = false,
    minDivisions = 1,
    maxDivisions = Number.MAX_SAFE_INTEGER,
    type = 'centripetal',
  }: {
    tension?: number
    divisions?: number
    divisionsPerUnit?: number
    maxDivisions?: number
    minDivisions?: number
    offset?: number
    closed?: boolean
    type?: CatmullRomType
  },
): Point[] {
  const splines = getCatmullRomSplinesFromPoints(points)
  if (divisions && divisionsPerUnit) {
    console.warn('You should only set `divisionsPerUnit` OR `divisions`')
  }
  return splines
    .map((spline, index, { length }) => {
      const splineLength = lineLength([spline[1], spline[2]])
      // account for TypeScript weirdness
      const positionDivisions: number =
        typeof (divisionsPerUnit as number | undefined) === 'number'
          ? clamp(
              Math.ceil(splineLength * (divisionsPerUnit as number)),
              minDivisions,
              maxDivisions,
            )
          : (divisions as number)

      const positions = linearSpace(0, 1, positionDivisions).slice(0, -1)
      const segment = getCatmullRomSegment(spline, type, tension)
      // include '1' position in the last spline in an open curve
      if (!closed && index === length - 1) {
        positions.push(1)
      }
      return positions.map((t) => {
        const point = getSegmentPoint(segment, t)
        if (offset === 0) return point
        const normal = getSegmentTangent(segment, t) + Math.PI / 2
        return translatePoint(normal, offset, point)
      })
    })
    .flat()
}

function translatePoint(
  angleInRadians: number,
  distance: number,
  { x, y }: Point,
) {
  return p(
    x + Math.cos(angleInRadians) * distance,
    y + Math.sin(angleInRadians) * distance,
  )
}

function lineLength(line: Line | [Point, Point]) {
  let originX: number
  let originY: number
  let endX: number
  let endY: number
  if (Array.isArray(line)) {
    originX = line[0].x
    originY = line[0].y
    endX = line[1].x
    endY = line[1].y
  } else {
    originX = line.origin.x
    originY = line.origin.y
    endX = line.end.x
    endY = line.end.y
  }
  return Math.sqrt(Math.pow(endX - originX, 2) + Math.pow(endY - originY, 2))
}

function getCatmullRomSplinesFromPoints(
  pathPoints: Point[],
  closed = false,
): CatmullRomSpline[] {
  const points = pathPoints.filter((point, index, allPoints) => {
    const previousPoint =
      allPoints[(index - 1 + allPoints.length) % allPoints.length]
    return !pointsAreEqual(point, previousPoint)
  })
  if (points.length < 2) return []
  const splines: CatmullRomSpline[] = []
  for (let i = 0, l = points.length - 1; i < l; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    let splineVector: Point | undefined = undefined
    let p0: Point
    let p3: Point
    if (i === 0 && !closed) {
      splineVector = subtractFromPoint(p1, p2)
      p0 = addToPoint(p1, splineVector)
    } else {
      p0 = points[(i - 1 + points.length) % points.length]
    }
    if (i === points.length - 2 && !closed) {
      const _splineVector = splineVector ?? subtractFromPoint(p1, p2)
      p3 = subtractFromPoint(p2, _splineVector)
    } else {
      p3 = points[(i + 2) % points.length]
    }
    splines.push([p0, p1, p2, p3])
  }
  if (closed) {
    // add spline which connects the end to the origin
    splines.push([
      points[(points.length - 2 + points.length) % points.length],
      points[(points.length - 1 + points.length) % points.length],
      points[points.length % points.length],
      points[(points.length + 1) % points.length],
    ])
  }
  return splines
}

function pointsAreEqual(a: Point, b: Point, tolerance = 0) {
  return tolerance === 0
    ? a.x === b.x && a.y === b.y
    : Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance
}

function addToPoint(point: Point, addition: Point) {
  return p(point.x + addition.x, point.y + addition.y)
}
