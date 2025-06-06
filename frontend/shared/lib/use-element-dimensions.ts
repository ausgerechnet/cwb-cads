import { useEffect, useState } from 'react'

export function useElementDimensions(
  element: HTMLElement | null,
  initialDimensions: [number, number] = [0, 0],
) {
  const [dimensions, setDimensions] = useState<[number, number]>(() => {
    if (!element) return initialDimensions
    return [element.clientWidth, element.clientHeight]
  })

  useEffect(() => {
    if (!element) return
    const resizeObserver = new ResizeObserver(function () {
      setDimensions([element.clientWidth, element.clientHeight])
    })
    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [element])

  return dimensions
}
