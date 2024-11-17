import { ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@cads/shared/lib/utils'

export function Ellipsis({
  children,
  direction = 'ltr',
  className,
}: {
  children: ReactNode
  direction?: 'ltr' | 'rtl'
  className?: string
}) {
  const { width, elementRef } = useElementSize<HTMLDivElement>()
  const ellipsisRef = useRef<HTMLSpanElement>(null)

  // TODO: re-examine CSS-only solution
  useEffect(() => {
    const container = elementRef.current
    const ellipsis = ellipsisRef.current
    if (!container || !ellipsis) return
    const childElements: HTMLElement[] = Array.from(
      container.querySelectorAll('& > *:not(.ellipsis)'),
    )
    childElements.forEach((child) => {
      child.style.display = ''
    })
    ellipsis.style.display = 'none'
    let childrenWidth = childElements.reduce(
      (total, child) => total + Math.ceil(child.getBoundingClientRect().width),
      0,
    )
    if (direction === 'rtl') {
      childElements.reverse()
    }
    if (childrenWidth <= width) return

    ellipsis.style.display = ''
    childrenWidth += ellipsis.offsetWidth
    while (childrenWidth > width) {
      const child = childElements.pop()
      if (!child) break
      childrenWidth -= child.offsetWidth
      child.style.display = 'none'
    }
  }, [width, elementRef, children])

  return (
    <div
      className={cn(
        className,
        'flex gap-0 overflow-hidden transition-opacity',
        direction === 'rtl' ? 'justify-end' : 'justify-start',
        width > 0 ? 'opacity-1' : 'opacity-0',
      )}
      ref={elementRef}
    >
      {direction === 'ltr' && children}
      {width > 0 && (
        <span className="ellipsis shrink" ref={ellipsisRef}>
          …
        </span>
      )}
      {direction === 'rtl' && children}
    </div>
  )
}

function useElementSize<T extends HTMLDivElement>() {
  const elementRef = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    function handleResize() {
      if (element) setWidth(element.offsetWidth)
    }
    const observer = new ResizeObserver(handleResize)
    observer.observe(element)
    handleResize()
    return () => observer.disconnect()
  }, [])

  return {
    elementRef,
    width,
  }
}
