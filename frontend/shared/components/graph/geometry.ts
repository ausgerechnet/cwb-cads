import { clamp } from '@cads/shared/lib/clamp'

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

export function pathToSvgPath(path: Path): string {
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

export function createPoint(x: number, y: number): Point {
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

export function pointsToCatmullRom(
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
