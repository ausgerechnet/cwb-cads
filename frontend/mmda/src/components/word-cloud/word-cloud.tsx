import { useCallback, useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { DndContext } from '@dnd-kit/core'
import {
  EyeClosedIcon,
  DotIcon,
  PaintbrushVerticalIcon,
  RectangleHorizontalIcon,
  FullscreenIcon,
} from 'lucide-react'

import { ButtonTooltip } from '@cads/shared/components/button-tooltip'
import { cn } from '@cads/shared/lib/utils'
import { clamp } from '@cads/shared/lib/clamp'
import { ToggleBar } from '@cads/shared/components/toggle-bar'
import { useElementDimensions } from '@cads/shared/lib/use-element-dimensions'
import {
  DiscoursemeDisplay,
  type CloudWorkerMessage,
  type CloudWorkerResponse,
  type WordDisplay,
} from './worker'
import { calculateWordDimensions } from './cloud'
import { WordCloudMiniMap } from './word-cloud-mini-map'
import { Item } from './item'

export type WordCloudEvent =
  | { type: 'new_discourseme'; surfaces: string[] }
  | { type: 'add_to_discourseme'; discoursemeId: number; surface: string }
  | { type: 'update_surface_position'; surface: string; x: number; y: number }
  | {
      type: 'update_discourseme_position'
      discoursemeId: number
      x: number
      y: number
    }
  | { type: 'set_filter_item'; item: string | null }
  | { type: 'set_filter_discourseme_ids'; discoursemeIds: number[] }

export type WordCloudWordIn = {
  x: number
  y: number
  label: string
  score: number
}

export type WordCloudDiscoursemeIn = {
  discoursemeId: number
  x: number
  y: number
  label: string
  score: number
}

function isDiscoursemeDisplay(
  item: WordDisplay | DiscoursemeDisplay,
): item is DiscoursemeDisplay {
  return 'discoursemeId' in item
}

const emptyDiscoursemes: WordCloudDiscoursemeIn[] = []
const emptyWords: WordCloudWordIn[] = []

export function WordCloud({
  className,
  words = emptyWords,
  discoursemes = emptyDiscoursemes,
  padding: [paddingX = 0, paddingY = 0] = [300, 100],
  filterItem = null,
  filterDiscoursemeIds,
  aspectRatio = 2 / 1,
  debug = false,
  cutOff = 0,
  hideOverflow = false,
  onChange,
}: {
  className?: string
  aspectRatio?: number
  words?: WordCloudWordIn[]
  discoursemes?: WordCloudDiscoursemeIn[]
  padding?: [number, number]
  filterItem?: string | null
  filterDiscoursemeIds?: number[]
  debug?: boolean
  cutOff?: number
  hideOverflow?: boolean
  onChange?: (event: WordCloudEvent) => void
}) {
  const dragStartRef = useRef<Date | null>(null)
  const [enablePositionalColor, setEnablePositionColor] = useState(false)
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [containerWidth, containerHeight] = useElementDimensions(container, [
    window.innerWidth,
    window.innerHeight,
  ])
  const [displayType, setDisplayType] = useState<'rectangle' | 'dot'>(
    'rectangle',
  )
  const [zoom, setZoom] = useState(1)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  // Tracks the currently hovered item -- useDroppable would be an alternative option, but causes a noticeable performance hit
  const [hoverItem, setHoverItem] = useState<string | null>(null)
  const [simulationStates, setSimulationStates] = useState<
    {
      zoom: number
      state: 'pending' | 'stable' | 'dirty'
      isRunning: boolean
      stableDuration: number
    }[]
  >([])

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.altKey && event.shiftKey && event.key === 'S') {
        event.preventDefault()
        setDisplayType((prev) => (prev === 'rectangle' ? 'dot' : 'rectangle'))
      }
      if (event.altKey && event.shiftKey && event.key === 'K') {
        event.preventDefault()
        setEnablePositionColor((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const toDisplayCoordinates = useCallback(
    (x: number, y: number): [number, number] => [
      ((x + 1) / 2) * (containerWidth - paddingX) + paddingX / 2,
      ((y + 1) / 2) * (containerHeight - paddingY) + paddingY / 2,
    ],
    [containerWidth, paddingX, containerHeight, paddingY],
  )

  const toOriginalCoordinates = useCallback(
    (displayX: number, displayY: number): [number, number] => [
      (displayX / (containerWidth - paddingX)) * 2,
      (displayY / (containerHeight - paddingY)) * 2,
    ],
    [containerWidth, paddingX, containerHeight, paddingY],
  )

  const [displayWords, setDisplayWords] = useState<WordDisplay[]>(() =>
    words.map((word) => {
      const [displayWidth, displayHeight] = calculateWordDimensions(
        word.label,
        word.score,
      )
      return {
        ...word,
        id: `word::${word.label}`,
        originX: word.x,
        originY: word.y,
        isBackground: word.score < cutOff,
        displayWidth,
        displayHeight,
        displayX: toDisplayCoordinates(word.x, word.y)[0],
        displayY: toDisplayCoordinates(word.x, word.y)[1],
        index: 0,
        isColliding: false,
        hasNearbyElements: false,
      }
    }),
  )
  const [displayDiscoursemes, setDisplayDiscoursemes] = useState<
    DiscoursemeDisplay[]
  >(() =>
    discoursemes.map((discourseme) => {
      const [displayWidth, displayHeight] = calculateWordDimensions(
        discourseme.label,
        discourseme.score,
      )
      return {
        ...discourseme,
        id: `discourseme::${discourseme.label}::${discourseme.discoursemeId}`,
        originX: discourseme.x,
        originY: discourseme.y,
        isBackground: false,
        displayWidth,
        displayHeight,
        displayX: toDisplayCoordinates(discourseme.x, discourseme.y)[0],
        displayY: toDisplayCoordinates(discourseme.x, discourseme.y)[1],
        index: 0,
        isColliding: false,
        hasNearbyElements: false,
      }
    }),
  )

  const handleSelect = useCallback(
    (
      item:
        | { type: 'word'; item: string }
        | { type: 'discourseme'; discoursemeId: number },
    ) => {
      if (item.type === 'word') {
        onChange?.({
          type: 'set_filter_item',
          item: item.item === filterItem ? null : item.item,
        })
      } else if (item.type === 'discourseme') {
        onChange?.({
          type: 'set_filter_discourseme_ids',
          discoursemeIds: filterDiscoursemeIds?.includes(item.discoursemeId)
            ? filterDiscoursemeIds.filter((id) => id !== item.discoursemeId)
            : [...(filterDiscoursemeIds ?? []), item.discoursemeId],
        })
      }
    },
    [filterDiscoursemeIds, filterItem, onChange],
  )

  const handleDragStart = useCallback(() => {
    dragStartRef.current = new Date()
    setIsDragging(true)
  }, [])
  const handleHover = useCallback((itemId: string) => setHoverItem(itemId), [])
  const handleLeave = useCallback(
    (itemId: string) =>
      setHoverItem((current) => (current === itemId ? null : current)),
    [],
  )

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    setWorker(worker)
    worker.onmessage = (event: MessageEvent<CloudWorkerResponse>) => {
      switch (event.data.type) {
        case 'ready':
          setIsReady(true)
          break
        case 'update_positions':
          setDisplayWords(event.data.words)
          setDisplayDiscoursemes(event.data.discoursemes)
          break
        case 'simulations':
          setSimulationStates(event.data.simulationStates)
          break
        default:
          console.warn('Unknown message type from worker:', event.data)
      }
    }
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    if (!worker || !isReady) return
    worker.postMessage({
      type: 'update',
      payload: {
        cutOff,
        displayWidth: containerWidth - paddingX,
        displayHeight: containerHeight - paddingY,
        words: words.map((word) => ({ id: `word::${word.label}`, ...word })),
        discoursemes: discoursemes.map((discourseme) => ({
          id: `discourseme::${discourseme.label}::${discourseme.discoursemeId}`,
          ...discourseme,
        })),
      },
    } satisfies CloudWorkerMessage)
  }, [
    worker,
    words,
    isReady,
    discoursemes,
    containerWidth,
    containerHeight,
    paddingX,
    paddingY,
    cutOff,
  ])

  return (
    <div className={cn('relative h-full w-full', className)}>
      <TransformWrapper
        initialScale={1}
        onTransformed={(event) => {
          setZoom((currentZoom) => {
            const newZoom = event.instance.transformState.scale
            if (newZoom !== currentZoom) {
              worker?.postMessage({
                type: 'zoom',
                payload: { zoom: newZoom },
              } satisfies CloudWorkerMessage)
            }
            return newZoom
          })
        }}
        wheel={{ step: 0.1, smoothStep: 0.005 }}
        panning={{ velocityDisabled: false, excluded: ['no-pan'] }}
        disabled={isDragging}
        limitToBounds
        minPositionX={0}
        maxScale={15}
      >
        {({ centerView }) => (
          <>
            <CenterButton
              centerView={centerView}
              className="absolute bottom-0 left-0 z-[5002]"
            />

            <ToggleBar
              className="absolute bottom-0 left-16 z-[5002] w-min"
              options={[
                [
                  'rectangle',
                  <RectangleHorizontalIcon className="h-4 w-4" />,
                  <>
                    Display as text
                    <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
                      alt + shift + s
                    </kbd>
                  </>,
                ],
                [
                  'dot',
                  <DotIcon className="h-4 w-4" />,
                  <>
                    Display as dots
                    <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
                      alt + shift + s
                    </kbd>
                  </>,
                ],
              ]}
              value={displayType}
              onChange={setDisplayType}
            />

            <ToggleBar
              className="absolute bottom-0 left-32 z-[5002] w-min"
              options={[
                [
                  'colored',
                  <PaintbrushVerticalIcon className="h-4 w-4" />,
                  <>
                    Colored by position
                    <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
                      alt + shift + k
                    </kbd>
                  </>,
                ],
                [
                  'monochrome',
                  <EyeClosedIcon className="h-4 w-4" />,
                  <>
                    Monochrome items
                    <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
                      alt + shift + k
                    </kbd>
                  </>,
                ],
              ]}
              value={enablePositionalColor ? 'colored' : 'monochrome'}
              onChange={(value) => setEnablePositionColor(value === 'colored')}
            />

            <WordCloudMiniMap
              className="bg-background/90 absolute left-0 top-0 z-[2000]"
              aspectRatio={aspectRatio}
              displayWords={displayWords}
              displayDiscoursemes={displayDiscoursemes}
              toDisplayCoordinates={toDisplayCoordinates}
            />

            {debug && (
              <div className="absolute right-0 top-0 z-[2000] rounded bg-black/50 p-1 text-sm leading-tight">
                Zoom: {zoom.toFixed(2)}
                <br />
                isDragging: {isDragging ? 'true' : 'false'}
                <br />
                Container Dimensions: {containerWidth} x {containerHeight}
                <br />
                {simulationStates.map(
                  ({ zoom, state, isRunning, stableDuration }) => (
                    <div key={zoom}>
                      {zoom.toFixed(2)}: {state} {isRunning ? ' (running)' : ''}
                      {stableDuration > 0 && <span>{stableDuration}ms</span>}
                    </div>
                  ),
                )}
              </div>
            )}

            <TransformComponent
              contentClass={cn(
                "before:absolute before:-inset-[500px] before:content-['']",
                debug && 'before:bg-blue-500/50',
              )}
              contentStyle={{ width: '100%', height: '100%' }}
              wrapperStyle={{
                overflow: hideOverflow ? 'hidden' : 'visible',
                width: '100%',
                height: '100%',
              }}
            >
              <DndContext
                onDragStart={handleDragStart}
                onDragAbort={() => setIsDragging(false)}
                onDragCancel={() => setIsDragging(false)}
                onDragEnd={(event) => {
                  const wasShortDrag = dragStartRef.current
                    ? new Date().getTime() - dragStartRef.current.getTime() <
                      500
                    : false
                  const id = event.active.id
                  const itemA =
                    displayWords.find((item) => item.id === id) ??
                    displayDiscoursemes.find((item) => item.id === id)
                  const itemB =
                    displayWords.find((item) => item.id === hoverItem) ??
                    displayDiscoursemes.find((item) => item.id === hoverItem)
                  const [deltaX, deltaY] = toOriginalCoordinates(
                    event.delta.x,
                    event.delta.y,
                  )
                  const minimumMoveDistance = 20 // Minimum distance to consider it a move
                  const wasMoved =
                    Math.abs(event.delta.x) > minimumMoveDistance ||
                    Math.abs(event.delta.y) > minimumMoveDistance

                  if (
                    itemA &&
                    itemB &&
                    itemA.id !== itemB.id &&
                    !wasShortDrag &&
                    !(
                      isDiscoursemeDisplay(itemA) && isDiscoursemeDisplay(itemB)
                    )
                  ) {
                    if (isDiscoursemeDisplay(itemB)) {
                      onChange?.({
                        type: 'add_to_discourseme',
                        discoursemeId: itemB.discoursemeId,
                        surface: itemA.label,
                      })
                    } else if (isDiscoursemeDisplay(itemA)) {
                      onChange?.({
                        type: 'add_to_discourseme',
                        discoursemeId: itemA.discoursemeId,
                        surface: itemB.label,
                      })
                    } else {
                      onChange?.({
                        type: 'new_discourseme',
                        surfaces: [itemA.label, itemB.label],
                      })
                    }
                  } else if (itemA && wasMoved) {
                    const newOriginalX = clamp(itemA.x + deltaX / zoom, -1, 1)
                    const newOriginalY = clamp(itemA.y + deltaY / zoom, -1, 1)

                    if (isDiscoursemeDisplay(itemA)) {
                      setDisplayDiscoursemes((discoursemes) =>
                        discoursemes.map((discourseme) =>
                          discourseme.id === itemA.id
                            ? {
                                ...discourseme,
                                originX: newOriginalX,
                                originY: newOriginalY,
                                x: newOriginalX,
                                y: newOriginalY,
                              }
                            : discourseme,
                        ),
                      )

                      worker?.postMessage({
                        type: 'update_position',
                        payload: {
                          id: itemA.id,
                          originX: newOriginalX,
                          originY: newOriginalY,
                        },
                      })
                      onChange?.({
                        type: 'update_discourseme_position',
                        discoursemeId: itemA.discoursemeId,
                        x: newOriginalX,
                        y: newOriginalY,
                      })
                    } else {
                      setDisplayWords((words) =>
                        words.map((word) =>
                          word.id === itemA.id
                            ? {
                                ...word,
                                originX: newOriginalX,
                                originY: newOriginalY,
                                x: newOriginalX,
                                y: newOriginalY,
                              }
                            : word,
                        ),
                      )

                      worker?.postMessage({
                        type: 'update_position',
                        payload: {
                          id: itemA.id,
                          originX: newOriginalX,
                          originY: newOriginalY,
                        },
                      })
                      onChange?.({
                        type: 'update_surface_position',
                        surface: itemA.label,
                        x: newOriginalX,
                        y: newOriginalY,
                      })
                    }
                  } else if (itemA && !wasMoved && wasShortDrag) {
                    handleSelect(
                      isDiscoursemeDisplay(itemA)
                        ? {
                            type: 'discourseme',
                            discoursemeId: itemA.discoursemeId,
                          }
                        : { type: 'word', item: itemA.label },
                    )
                  }
                  setIsDragging(false)
                }}
              >
                <div
                  className={cn(
                    '@container absolute flex h-full w-full items-center justify-center',
                    debug && 'bg-pink-500/50',
                  )}
                >
                  <div
                    ref={setContainer}
                    className="bg-muted/50 relative max-h-full max-w-full rounded-lg outline-1"
                    style={{
                      aspectRatio,
                      width: `clamp(0px, 100cqw, calc(${aspectRatio} * 100cqh))`,
                    }}
                  >
                    <div
                      id="bla"
                      className="outline-border pointer-events-none absolute touch-none rounded-lg outline-dotted outline-1"
                      style={{
                        left: paddingX / 2,
                        top: paddingY / 2,
                        width: `calc(100% - ${paddingX}px)`,
                        height: `calc(100% - ${paddingY}px)`,
                      }}
                    />
                    {displayWords.map((word) => (
                      <Item
                        key={word.label}
                        isSelected={word.label === filterItem}
                        displayType={displayType}
                        word={word}
                        debug={debug}
                        toDisplayCoordinates={toDisplayCoordinates}
                        zoom={zoom}
                        onHover={handleHover}
                        onLeave={handleLeave}
                        enablePositionalColor={enablePositionalColor}
                      />
                    ))}

                    {displayDiscoursemes.map((discourseme) => (
                      <Item
                        key={discourseme.label}
                        isSelected={
                          filterDiscoursemeIds?.includes(
                            discourseme.discoursemeId,
                          ) ?? false
                        }
                        onHover={handleHover}
                        onLeave={handleLeave}
                        word={discourseme}
                        debug={debug}
                        discoursemeId={discourseme.discoursemeId}
                        toDisplayCoordinates={toDisplayCoordinates}
                        zoom={zoom}
                      />
                    ))}

                    {debug && (
                      <svg
                        className="pointer-events-none absolute z-[5001] touch-none"
                        viewBox={`-1 -1 ${aspectRatio} ${aspectRatio}`}
                        style={{
                          left: paddingX / 2,
                          top: paddingY / 2,
                          width: `calc(100% - ${paddingX}px)`,
                          height: `calc(100% - ${paddingY}px)`,
                        }}
                      >
                        {displayWords.map((word) => (
                          <line
                            key={word.label}
                            data-for-word={word.label}
                            x1={word.originX * aspectRatio}
                            y1={word.originY}
                            x2={word.x * aspectRatio}
                            y2={word.y}
                            className="stroke stroke-emerald-500 stroke-[1px]"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </svg>
                    )}
                  </div>
                </div>
              </DndContext>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}

function CenterButton({
  centerView,
  className,
}: {
  centerView: (zoom?: number) => void
  className?: string
}) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.altKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault()
        centerView(1)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [centerView])
  return (
    <ButtonTooltip
      onClick={() => centerView(1)}
      className={className}
      variant="secondary"
      size="icon"
      tooltip={
        <>
          Center view{' '}
          <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
            alt + shift + z
          </kbd>
        </>
      }
    >
      <FullscreenIcon className="h-5 w-5" />
    </ButtonTooltip>
  )
}
