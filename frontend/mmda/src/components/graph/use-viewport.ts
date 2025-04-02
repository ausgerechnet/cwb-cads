import { useMemo } from 'react'

export function useViewport(
  dataPoints?: {
    position: [number, number]
  }[],
  bands?: { points: [number, [number, number]][]; className?: string }[],
  lines?: [number, number][][],
  viewportX?: [number, number], // x-start, x-end
  viewportY?: [number, number?], // y-start, y-end
  pointStyle?: 'circle' | 'bar',
) {
  const { minX, maxX, minY, maxY, barWidth } = useMemo(() => {
    const pointXs = dataPoints?.flat(2).map((point) => point.position[0]) ?? []
    const allX = [
      ...pointXs,
      ...(bands?.map((band) => band.points.map(([x]) => x).flat(2)).flat() ??
        []),
      ...(lines?.flat().map((line) => line[0]) ?? []),
    ]
    const allY = [
      ...(dataPoints?.flat(2).map((point) => point.position[1]) ?? []),
      ...(bands?.map((band) => band.points.map(([, ys]) => ys)).flat(2) ?? []),
      ...(lines?.flat().map((line) => line[1]) ?? []),
    ]

    const barWidth =
      pointStyle === 'bar'
        ? pointXs.reduce((smallestWidth, x, index, pointsX) => {
            if (index === 0) return smallestWidth
            const prevX = pointsX[index - 1]
            const width = Math.abs(prevX - x) * 0.6
            return Math.min(smallestWidth, width)
          }, Infinity)
        : 0

    return {
      minX: Math.min(...allX),
      maxX: Math.max(...allX),
      minY: Math.min(...allY),
      maxY: Math.max(...allY),
      barWidth,
    }
  }, [dataPoints, bands, lines, pointStyle])

  const valueRangeX = maxX - minX
  const valueRangeY = maxY - minY

  const viewboxX = viewportX
    ? viewportX[0]
    : minX - Math.max(valueRangeX * 0.025, 0.025, barWidth / 2)
  const viewboxY = viewportY
    ? viewportY[0]
    : minY - Math.max(valueRangeY * 0.1, 0.1)
  const viewboxWidth = Math.max(
    viewportX
      ? viewportX[1] - viewportX[0]
      : valueRangeX + Math.max(barWidth, valueRangeX * 0.05, 0.05),
    0.005 * valueRangeX,
  )
  const viewboxYMax = viewportY?.[1] ? viewportY[1] : maxY
  const viewboxHeight = viewportY
    ? viewboxYMax - viewportY[0]
    : valueRangeY + Math.max(valueRangeY * 0.2, 0.2)

  const flipY = (y: number) => {
    return viewboxY + viewboxHeight - (y - viewboxY)
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    barWidth,
    valueRangeX,
    valueRangeY,
    viewboxX,
    viewboxY,
    viewboxWidth,
    viewboxHeight,
    flipY,
  }
}
