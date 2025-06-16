import { useMemo, type ReactNode } from 'react'
import { KeepScale } from 'react-zoom-pan-pinch'
import { useDndContext, useDraggable } from '@dnd-kit/core'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { WordDisplay } from './worker'

export function Item({
  word,
  discoursemeId,
  toDisplayCoordinates,
  debug = false,
  enablePositionalColor = false,
  displayType = 'rectangle',
  zoom,
  isSelected,
  onHover,
  onLeave,
}: {
  word: WordDisplay
  discoursemeId?: number
  toDisplayCoordinates: (x: number, y: number) => [number, number]
  debug?: boolean
  enablePositionalColor?: boolean
  zoom: number
  isSelected: boolean
  displayType?: 'rectangle' | 'dot'
  onHover?: (id: string) => void
  onLeave?: (id: string) => void
}) {
  const { active } = useDndContext()
  const isDraggingOther = Boolean(active?.id) && active?.id !== word.id
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: word.id,
    disabled: isDraggingOther,
  })
  const [displayOriginX, displayOriginY] = toDisplayCoordinates(
    word.originX,
    word.originY,
  )
  const [displayX, displayY] =
    displayType === 'dot'
      ? [displayOriginX, displayOriginY]
      : toDisplayCoordinates(word.x, word.y)
  const isDiscourseme = discoursemeId !== undefined
  const [positionColorLight, positionColorDark] = useMemo(
    () => getPositionColor(word.originX, word.originY),
    [word.originX, word.originY],
  )

  return (
    <>
      <Container
        displayType={displayType}
        word={word}
        x={displayX}
        y={displayY}
        isDraggingOther={isDraggingOther}
        zoom={zoom}
        isDragging={isDragging}
        isDiscourseme={isDiscourseme}
      >
        <div
          ref={setNodeRef}
          aria-disabled={word.isBackground}
          aria-selected={isSelected}
          className={cn(
            'aria-selected:outline-primary group/item aria-selected:outline-3 aria-selected:shadow-primary/50 absolute left-0 top-0 flex origin-center -translate-x-1/2 -translate-y-1/2 rounded-lg outline outline-transparent aria-selected:shadow-md',
            {
              'bg-red-500/50': debug && word.isColliding,
              'bg-blue-500/50': debug && word.hasNearbyElements,
              'h-2 w-2 rounded-full bg-slate-300 text-opacity-0 opacity-50 aria-disabled:bg-slate-700 aria-disabled:opacity-30':
                displayType === 'dot',
            },
          )}
          style={{
            scale:
              displayType === 'dot' ? `${word.score * 200 + 100}%` : '100%',
            ...(displayType === 'rectangle'
              ? { width: word.displayWidth, height: word.displayHeight }
              : {}),
          }}
        >
          {displayType === 'rectangle' && (
            <button
              ref={setNodeRef}
              {...listeners}
              className={cn(
                'outline-background/10 flex flex-grow origin-center cursor-pointer select-none content-center items-center justify-center text-nowrap rounded-md bg-slate-200 text-center leading-none outline outline-2 transition-transform delay-300 duration-500 group-aria-disabled/item:bg-slate-100 group-aria-disabled/item:text-slate-400 group-aria-disabled/item:outline-0 dark:bg-slate-800 dark:text-slate-300 dark:group-aria-disabled/item:bg-slate-800 dark:group-aria-disabled/item:text-slate-700',
                'group-focus-visible:outline-white/50',
                {
                  'outline-red-700': debug && word.hasNearbyElements,
                  'bg-red-700': debug && word.isColliding,
                  'outline outline-1 outline-current':
                    discoursemeId !== undefined,
                  'hover:bg-yellow-500 dark:hover:bg-yellow-500':
                    isDraggingOther,
                  'bg-[var(--discourseme-text)] text-[var(--discourseme-bg)] dark:bg-[var(--discourseme-bg)] dark:text-[var(--discourseme-text)]':
                    isDiscourseme,
                  'hover:bg-primary hover:text-secondary dark:hover:bg-primary dark:hover:text-secondary':
                    !isDraggingOther,
                  'bg-[var(--position-color-light)] text-[var(--position-color-dark)] dark:bg-[var(--position-color-dark)] dark:text-[var(--position-color-light)]':
                    enablePositionalColor,
                },
              )}
              onMouseOver={() => onHover?.(word.id)}
              onMouseLeave={() => onLeave?.(word.id)}
              style={{
                fontSize: `${12 + 20 * word.score}px`,
                ['--discourseme-bg' as string]: getColorForNumber(
                  discoursemeId ?? 0,
                  0.9,
                  0.5,
                  0.3,
                ),
                ['--discourseme-text' as string]: getColorForNumber(
                  discoursemeId ?? 0,
                  1,
                  0.8,
                  0.8,
                ),
                ['--position-color-light' as string]: positionColorLight,
                ['--position-color-dark' as string]: positionColorDark,
              }}
            >
              {isDiscourseme && (
                <ChevronLeftIcon className="h-4 w-4 scale-y-[2]" />
              )}

              {word.label}

              {isDiscourseme && (
                <ChevronRightIcon className="h-4 w-4 scale-y-[2]" />
              )}

              {debug && (
                <span
                  className={cn(
                    'absolute left-0 top-0 bg-black/30 p-0.5 text-xs text-white',
                    word.isBackground && 'opacity-50',
                  )}
                >
                  {word.score.toFixed(2)}
                </span>
              )}

              {debug && !word.isBackground && (
                <span className="pointer-events-none absolute left-0 top-0 h-full w-full scale-[2] outline-dotted outline-[1px] outline-gray-600" />
              )}
            </button>
          )}
        </div>
      </Container>

      <OriginDot
        x={displayOriginX}
        y={displayOriginY}
        isHidden={Boolean(!isDragging || word.isBackground)}
      />
    </>
  )
}

function Container({
  word,
  x,
  y,
  isDraggingOther,
  isDiscourseme,
  zoom,
  isDragging,
  displayType,
  className,
  children,
}: {
  isDraggingOther: boolean
  isDragging: boolean
  word: WordDisplay
  x: number
  y: number
  isDiscourseme: boolean
  zoom: number
  displayType: 'rectangle' | 'dot'
  className?: string
  children: ReactNode
}) {
  const { transform } = useDraggable({ id: word.id, disabled: isDraggingOther })
  return (
    <div
      className={cn(
        'group absolute left-0 top-0 translate-x-[calc(var(--x)-50%)] translate-y-[calc(var(--y)-50%)] touch-none hover:z-[6000!important] [&:hover+*]:block',
        {
          'pointer-events-none z-[5001!important] opacity-50 will-change-transform':
            isDragging,
          'transition-transform duration-500': !isDragging,
          'pointer-events-none': word.isBackground || displayType === 'dot',
          'no-pan touch-none': !word.isBackground,
        },
        className,
      )}
      style={{
        ['--x' as string]: `${x + (transform?.x ?? 0) / zoom}px`,
        ['--y' as string]: `${y + (transform?.y ?? 0) / zoom}px`,
        zIndex: word.isBackground
          ? 0
          : (isDiscourseme ? 1_000 : 0) + Math.floor(word.score * 100) + 10,
      }}
    >
      <KeepScale>{children}</KeepScale>
    </div>
  )
}

function OriginDot({
  x,
  y,
  isHidden,
}: {
  x: number
  y: number
  isHidden: boolean
}) {
  return (
    <div
      className="pointer-events-none absolute z-[11000] aria-hidden:hidden"
      style={{ left: x, top: y }}
      aria-hidden={isHidden}
    >
      <KeepScale>
        <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500" />
          <span className="absolute left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-emerald-500 outline outline-1 outline-white" />
        </span>
      </KeepScale>
    </div>
  )
}

function getPositionColor(x: number, y: number) {
  const r = Math.sqrt(x ** 2 + y ** 2) / Math.SQRT2
  const g = (interpolate(y) + 1) / 2 + 0.5
  const b = (interpolate(x) + 1) / 2 + 0.5

  const base = [toRGB(r), toRGB(g), toRGB(b)]

  const bright = `rgb(${base.map(brighten).join(',')})`
  const dark = `rgb(${base.map(darken).join(',')})`

  return [bright, dark]

  function interpolate(v: number) {
    return Math.sign(v) * Math.pow(Math.abs(v), 0.5)
  }

  function brighten(c: number) {
    return Math.min(255, Math.round(c + 0.4 * (255 - c)))
  }

  function darken(c: number) {
    return Math.round(c * 0.4)
  }

  function toRGB(v: number) {
    return Math.round(255 * Math.min(Math.max(v, 0), 1))
  }
}
