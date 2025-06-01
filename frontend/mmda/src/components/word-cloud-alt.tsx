import { HTMLAttributes, useCallback, useEffect, useState } from 'react'
import {
  TransformWrapper,
  TransformComponent,
  KeepScale,
} from 'react-zoom-pan-pinch'
import { DndContext, useDndContext, useDraggable } from '@dnd-kit/core'
import { FullscreenIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { Slider } from '@cads/shared/components/ui/slider'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { Button } from '@cads/shared/components/ui/button'
import {
  DiscoursemeDisplay,
  type CloudWorkerMessage,
  type CloudWorkerResponse,
  type WordDisplay,
} from './word-cloud-worker'
import { calculateWordDimensions } from './word-cloud-compute'

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

function isDiscoursemeDisplay(
  item: WordDisplay | DiscoursemeDisplay,
): item is DiscoursemeDisplay {
  return 'discoursemeId' in item
}

export function WordCloudAlt({
  className,
  words = [],
  discoursemes = [],
  width = 2_000,
  height = 1_000,
  debug = false,
  defaultCutOff = 0.5,
  hideOverflow = false,
  onChange,
}: {
  className?: string
  width?: number
  height?: number
  words?: {
    x: number
    y: number
    originX?: number
    originY?: number
    label: string
    score: number
    isBackground?: boolean
  }[]
  discoursemes?: {
    discoursemeId: number
    x: number
    y: number
    originX?: number
    originY?: number
    label: string
    score: number
  }[]
  debug?: boolean
  defaultCutOff?: number
  hideOverflow?: boolean
  onChange?: (event: WordCloudEvent) => void
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [[containerWidth, containerHeight], setContainerSize] = useState<
    [number, number]
  >([100, 100])
  const [zoom, setZoom] = useState(1)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [cutOff, setCutOff] = useState(defaultCutOff)
  const [isDragging, setIsDragging] = useState(false)
  // Tracks the currently hovered item -- useDroppable would be an alternative option, but causes a noticeable performance hit
  const [hoverItem, setHoverItem] = useState<string | null>(null)

  useEffect(() => {
    if (!container) return
    function handleResize() {
      let { clientHeight, clientWidth } = container!
      // the container contains the actual word cloud which has a fixed aspect ratio, so downscale the width and height accordingly
      if (clientWidth / clientHeight > width / height) {
        clientWidth = (clientHeight * width) / height
      } else {
        clientHeight = (clientWidth * height) / width
      }
      worker?.postMessage({
        type: 'update_size',
        payload: { displayWidth: clientWidth, displayHeight: clientHeight },
      } satisfies CloudWorkerMessage)
      setContainerSize([clientWidth, clientHeight])
    }
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [container, height, width, worker])

  const toDisplayCoordinates = useCallback(
    (x: number, y: number): [number, number] => [
      (x / width) * containerWidth,
      (y / height) * containerHeight,
    ],
    [width, containerWidth, height, containerHeight],
  )

  const toOriginalCoordinates = useCallback(
    (displayX: number, displayY: number): [number, number] => [
      (displayX / containerWidth) * width,
      (displayY / containerHeight) * height,
    ],
    [containerWidth, width, containerHeight, height],
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
        originX: word.originX ?? word.x,
        originY: word.originY ?? word.y,
        isBackground: word.isBackground ?? false,
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
        originX: discourseme.originX ?? discourseme.x,
        originY: discourseme.originY ?? discourseme.y,
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

  useEffect(() => {
    const worker = new Worker(
      new URL('./word-cloud-worker.ts', import.meta.url),
      { type: 'module' },
    )
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
        default:
          console.warn('Unknown message type from worker:', event.data)
      }
    }
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    if (!worker || !isReady || !container) return
    worker.postMessage({
      type: 'update',
      payload: {
        width,
        height,
        displayWidth: container.clientWidth,
        displayHeight: container.clientHeight,
        words: words.map((word) => ({
          id: `word::${word.label}`,
          ...word,
        })),
        discoursemes: discoursemes.map((discourseme) => ({
          id: `discourseme::${discourseme.label}::${discourseme.discoursemeId}`,
          ...discourseme,
        })),
      },
    } satisfies CloudWorkerMessage)
  }, [worker, words, width, height, isReady, container, discoursemes])

  return (
    <div className={cn('relative h-full w-full', className)} ref={setContainer}>
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
        wheel={{ step: 0.1, smoothStep: 0.001 }}
        panning={{ velocityDisabled: false, excluded: ['no-pan'] }}
        disabled={isDragging}
        limitToBounds
        minPositionX={0}
      >
        {({ centerView }) => (
          <>
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
                onDragStart={() => setIsDragging(true)}
                onDragAbort={() => setIsDragging(false)}
                onDragCancel={() => setIsDragging(false)}
                onDragEnd={(event) => {
                  const id = event.active.id
                  const itemA =
                    displayWords.find((item) => item.id === id) ??
                    displayDiscoursemes.find((item) => item.id === id)
                  const itemB =
                    displayWords.find((item) => item.id === hoverItem) ??
                    displayDiscoursemes.find((item) => item.id === hoverItem)
                  if (
                    itemA &&
                    itemB &&
                    itemA.id !== itemB.id &&
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
                  } else if (itemA) {
                    const [deltaX, deltaY] = toOriginalCoordinates(
                      event.delta.x,
                      event.delta.y,
                    )
                    const newOriginalX = itemA.x + deltaX / zoom
                    const newOriginalY = itemA.y + deltaY / zoom

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

                      onChange?.({
                        type: 'update_surface_position',
                        surface: itemA.label,
                        x: newOriginalX,
                        y: newOriginalY,
                      })
                    }
                  }
                  setIsDragging(false)
                }}
              >
                <div
                  className={cn(
                    'absolute grid h-full w-full place-items-center',
                    debug && 'bg-pink-500/50',
                  )}
                >
                  <div
                    className="bg-muted/50 relative w-full rounded-lg outline-1"
                    style={{
                      aspectRatio: `${width} / ${height}`,
                    }}
                  >
                    {displayWords.map((word) => (
                      <Item
                        key={word.label}
                        word={word}
                        debug={debug}
                        toDisplayCoordinates={toDisplayCoordinates}
                        zoom={zoom}
                        onMouseOver={() => {
                          setHoverItem(word.id)
                        }}
                        onMouseOut={() => {
                          setHoverItem(null)
                        }}
                      />
                    ))}

                    {displayDiscoursemes.map((discourseme) => (
                      <Item
                        key={discourseme.label}
                        word={{ ...discourseme, isBackground: false }}
                        debug={debug}
                        discoursemeId={discourseme.discoursemeId}
                        toDisplayCoordinates={toDisplayCoordinates}
                        zoom={zoom}
                        onMouseOver={() => {
                          setHoverItem(discourseme.id)
                        }}
                        onMouseOut={() => {
                          setHoverItem(null)
                        }}
                      />
                    ))}

                    {debug && (
                      <svg
                        className="pointer-events-none absolute inset-0 z-[5001] h-full w-full touch-none"
                        viewBox={`0 0 ${width} ${height}`}
                      >
                        {displayWords.map((word) => (
                          <line
                            key={word.label}
                            data-for-word={word.label}
                            x1={word.originX}
                            y1={word.originY}
                            x2={word.x}
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

            <Button
              onClick={() => centerView(1)}
              className="absolute bottom-1 left-1 z-[5002]"
              variant="secondary"
              size="icon"
            >
              <FullscreenIcon className="h-5 w-5" />
            </Button>
          </>
        )}
      </TransformWrapper>

      <Slider
        className="absolute bottom-2 left-1/2 z-50 w-[300px] -translate-x-1/2"
        value={[cutOff]}
        onValueChange={(value) => {
          setCutOff(value[0])
          if (worker) {
            worker.postMessage({
              type: 'update_cutoff',
              payload: { cutOff: value[0] },
            } satisfies CloudWorkerMessage)
          }
        }}
        min={0}
        max={1}
        step={0.01}
      />

      {debug && (
        <div className="absolute left-2 top-2 z-40 bg-black/50">
          Zoom: {zoom.toFixed(2)}
          <br />
          isDragging: {isDragging ? 'true' : 'false'}
          <br />
          Container Dimensions: {containerWidth} x {containerHeight}
        </div>
      )}
    </div>
  )
}

function Item({
  word,
  discoursemeId,
  toDisplayCoordinates,
  debug = false,
  zoom,
  ...props
}: {
  word: WordDisplay
  discoursemeId?: number
  toDisplayCoordinates: (x: number, y: number) => [number, number]
  debug?: boolean
  zoom: number
} & HTMLAttributes<HTMLDivElement>) {
  const { active } = useDndContext()
  const isDraggingOther = Boolean(active?.id) && active?.id !== word.id
  const { attributes, listeners, setNodeRef, isDragging, transform } =
    useDraggable({ id: word.id, disabled: isDraggingOther })
  const [displayX, displayY] = toDisplayCoordinates(word.x, word.y)
  const [displayOriginX, displayOriginY] = toDisplayCoordinates(
    word.originX ?? word.x,
    word.originY ?? word.y,
  )

  return (
    <>
      <div
        className={cn(
          'absolute left-0 top-0 translate-x-[calc(var(--x)-50%)] translate-y-[calc(var(--y)-50%)] touch-none hover:z-[1000!important] [&:hover+*]:block',
          `word--${word.label.replace(/\s+/g, '-')}`,
          {
            'z-[5001!important] opacity-50 will-change-transform': isDragging,
            'transition-transform duration-500': !isDragging,
            'pointer-events-none': word.isBackground,
            'no-pan touch-none': !word.isBackground,
          },
        )}
        style={{
          ['--x' as string]: `${displayX + (transform?.x ?? 0) / zoom}px`,
          ['--y' as string]: `${displayY + (transform?.y ?? 0) / zoom}px`,
          zIndex: word.isBackground ? 0 : Math.floor(word.score * 100) + 10,
        }}
        {...attributes}
        {...listeners}
        {...props}
      >
        <KeepScale>
          <div
            className={cn(
              'absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2',
              {
                'bg-red-500/50': debug && word.isColliding,
                'bg-blue-500/50': debug && word.hasNearbyElements,
              },
            )}
            style={{
              width: word.displayWidth,
              height: word.displayHeight - 6,
            }}
          >
            <span
              ref={setNodeRef}
              className={cn(
                'absolute left-0 top-0 flex h-full w-full cursor-pointer select-none content-center items-center justify-center text-nowrap rounded-md bg-slate-800 text-center leading-none text-slate-300 outline outline-2 outline-transparent',
                {
                  'outline-red-700': debug && word.hasNearbyElements,
                  'bg-red-700': debug && word.isColliding,
                  'bg-slate-900 text-slate-700 outline-0': word.isBackground,
                  'outline outline-1 outline-current':
                    discoursemeId !== undefined,
                  'hover:bg-yellow-500': isDraggingOther,
                  'hover:bg-primary': !isDraggingOther,
                },
              )}
              style={{
                // transform: `translate(-50%, -50%)`,
                fontSize: `${12 + 20 * word.score}px`,
                ...(discoursemeId === undefined
                  ? {}
                  : {
                      backgroundColor: getColorForNumber(
                        discoursemeId,
                        0.9,
                        0.1,
                        0.3,
                      ),
                      color: getColorForNumber(discoursemeId, 1, 0.8, 0.7),
                    }),
              }}
            >
              {word.label}
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
            </span>
          </div>
        </KeepScale>
      </div>

      {!word.isBackground && (
        <div
          className={cn(
            'pointer-events-none absolute z-[5002]',
            !isDragging && 'hidden',
          )}
          style={{
            left: displayOriginX,
            top: displayOriginY,
          }}
        >
          <KeepScale>
            <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500" />
              <span className="absolute left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-emerald-500 outline outline-1 outline-white" />
            </span>
          </KeepScale>
        </div>
      )}
    </>
  )
}
