import { useCallback, useEffect, useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { DndContext } from '@dnd-kit/core'
import { DotIcon, RectangleHorizontalIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { Slider } from '@cads/shared/components/ui/slider'
import { clamp } from '@cads/shared/lib/clamp'
import { ToggleBar } from '@cads/shared/components/toggle-bar'
import { useElementDimensions } from '@cads/shared/lib/use-element-dimensions'
import {
  DiscoursemeDisplay,
  type CloudWorkerMessage,
  type CloudWorkerResponse,
  type WordDisplay,
} from './word-cloud-worker'
import { calculateWordDimensions } from './word-cloud-compute'
import { CenterButton } from './center-button'
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

function isDiscoursemeDisplay(
  item: WordDisplay | DiscoursemeDisplay,
): item is DiscoursemeDisplay {
  return 'discoursemeId' in item
}

export function WordCloudAlt({
  className,
  words = [],
  discoursemes = [],
  aspectRatio = 2 / 1,
  debug = false,
  defaultCutOff = 0.5,
  hideOverflow = false,
  onChange,
}: {
  className?: string
  aspectRatio?: number
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
  const [containerWidth, containerHeight] = useElementDimensions(
    container,
    [200, 100],
  )
  const [displayType, setDisplayType] = useState<'rectangle' | 'dot'>(
    'rectangle',
  )
  const [zoom, setZoom] = useState(1)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [cutOff, setCutOff] = useState(defaultCutOff)
  const [isDragging, setIsDragging] = useState(false)
  // Tracks the currently hovered item -- useDroppable would be an alternative option, but causes a noticeable performance hit
  const [hoverItem, setHoverItem] = useState<string | null>(null)

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      console.log('Keydown event:', event)
      if (event.altKey && event.shiftKey && event.key === 'S') {
        event.preventDefault()
        setDisplayType((prev) => (prev === 'rectangle' ? 'dot' : 'rectangle'))
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const toDisplayCoordinates = useCallback(
    (x: number, y: number): [number, number] => [
      ((x + 1) / 2) * containerWidth,
      ((y + 1) / 2) * containerHeight,
    ],
    [containerWidth, containerHeight],
  )

  const toOriginalCoordinates = useCallback(
    (displayX: number, displayY: number): [number, number] => [
      clamp((displayX / containerWidth) * 2, -1, 1),
      clamp((displayY / containerHeight) * 2, -1, 1),
    ],
    [containerWidth, containerHeight],
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
        width: 2,
        height: 2,
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
  }, [worker, words, isReady, container, discoursemes])

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
        wheel={{ step: 0.1, smoothStep: 0.001 }}
        panning={{ velocityDisabled: false, excluded: ['no-pan'] }}
        disabled={isDragging}
        limitToBounds
        minPositionX={0}
      >
        {({ centerView }) => (
          <>
            <CenterButton centerView={centerView} />

            <ToggleBar
              className="absolute bottom-1 left-16 z-[5002] w-min"
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

            <WordCloudMiniMap
              className="bg-background/90 absolute left-2 top-2 z-[2000]"
              aspectRatio={aspectRatio}
              displayWords={displayWords}
              displayDiscoursemes={displayDiscoursemes}
              toDisplayCoordinates={toDisplayCoordinates}
            />

            {debug && (
              <div className="absolute right-2 top-2 z-[2000] bg-black/50">
                Zoom: {zoom.toFixed(2)}
                <br />
                isDragging: {isDragging ? 'true' : 'false'}
                <br />
                Container Dimensions: {containerWidth} x {containerHeight}
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
                    {displayWords.map((word) => (
                      <Item
                        key={word.label}
                        displayType={displayType}
                        word={word}
                        debug={debug}
                        toDisplayCoordinates={toDisplayCoordinates}
                        zoom={zoom}
                        onMouseOver={() => setHoverItem(word.id)}
                        onMouseOut={() => setHoverItem(null)}
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
                        viewBox={`-1 -1 ${aspectRatio} ${aspectRatio}`}
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
