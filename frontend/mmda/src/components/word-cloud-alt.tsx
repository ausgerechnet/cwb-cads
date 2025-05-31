import { useCallback, useEffect, useState } from 'react'
import {
  TransformWrapper,
  TransformComponent,
  KeepScale,
} from 'react-zoom-pan-pinch'

import { cn } from '@cads/shared/lib/utils'
import { Slider } from '@cads/shared/components/ui/slider'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import {
  DiscoursemeDisplay,
  type CloudWorkerMessage,
  type CloudWorkerResponse,
  type WordDisplay,
} from './word-cloud-worker'
import { calculateWordDimensions } from './word-cloud-compute'

export function WordCloudAlt({
  words = [],
  discoursemes = [],
  width = 2_000,
  height = 1_000,
  debug = false,
  defaultCutOff = 0.5,
}: {
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
    id: number
    x: number
    y: number
    originX?: number
    originY?: number
    label: string
    score: number
  }[]
  debug?: boolean
  defaultCutOff?: number
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [worker, setWorker] = useState<Worker | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [cutOff, setCutOff] = useState(defaultCutOff)

  const toDisplayCoordinates = useCallback(
    (x: number, y: number): [number, number] => [
      (x / width) * (container?.clientWidth ?? width),
      (y / height) * (container?.clientHeight ?? height),
    ],
    [width, height, container],
  )

  const [displayWords, setDisplayWords] = useState<WordDisplay[]>(() =>
    words.map((word) => {
      const [displayWidth, displayHeight] = calculateWordDimensions(
        word.label,
        word.score,
      )
      return {
        ...word,
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
          x: word.x,
          y: word.y,
          originX: word.originX,
          originY: word.originY,
          label: word.label,
          score: word.score,
          isBackground: word.isBackground,
        })),
        discoursemes: discoursemes.map((discourseme) => ({
          id: discourseme.id,
          x: discourseme.x,
          y: discourseme.y,
          originX: discourseme.originX,
          originY: discourseme.originY,
          label: discourseme.label,
          score: discourseme.score,
        })),
      },
    } satisfies CloudWorkerMessage)
  }, [worker, words, width, height, isReady, container, discoursemes])

  return (
    <div className="relative aspect-[2/1]" ref={setContainer}>
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
        panning={{ velocityDisabled: true, excluded: ['no-pan'] }}
        limitToBounds
        minPositionX={0}
      >
        <TransformComponent contentClass="w-full" wrapperClass="w-full">
          <div
            className="relative w-full min-w-[500px] outline outline-1 outline-yellow-300"
            style={{
              aspectRatio: `${width} / ${height}`,
            }}
          >
            {displayWords.map((word) => (
              <Item
                word={word}
                debug={debug}
                toDisplayCoordinates={toDisplayCoordinates}
              />
            ))}

            {displayDiscoursemes.map((discourseme) => (
              <Item
                key={discourseme.label}
                word={{ ...discourseme, isBackground: false }}
                debug={debug}
                discoursemeId={discourseme.id}
                toDisplayCoordinates={toDisplayCoordinates}
              />
            ))}

            {debug && (
              <svg
                className="pointer-events-none absolute inset-0 z-[5001] h-full w-full"
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
        </TransformComponent>
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
}: {
  word: WordDisplay
  discoursemeId?: number
  toDisplayCoordinates: (x: number, y: number) => [number, number]
  debug?: boolean
}) {
  const [displayX, displayY] = toDisplayCoordinates(word.x, word.y)
  const [displayOriginX, displayOriginY] = toDisplayCoordinates(
    word.originX ?? word.x,
    word.originY ?? word.y,
  )

  return (
    <>
      <div
        className={cn(
          'absolute left-0 top-0 translate-x-[calc(var(--x)-50%)] translate-y-[calc(var(--y)-50%)] transition-transform duration-500 hover:z-[500!important] [&:hover+*]:block',
          `word--${word.label.replace(/\s+/g, '-')}`,
        )}
        style={{
          ['--x' as string]: `${displayX}px`,
          ['--y' as string]: `${displayY}px`,
          zIndex: word.isBackground ? 0 : Math.floor(word.score * 100) + 10,
        }}
      >
        <KeepScale>
          <span
            className={cn(
              'hover:bg-primary absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none content-center items-center justify-center text-nowrap rounded-md bg-slate-800 text-center leading-none text-slate-300 mix-blend-screen outline outline-2 outline-transparent',
              debug && word.hasNearbyElements && 'outline-red-700',
              debug && word.isColliding && 'bg-red-700',
              word.isBackground &&
                'pointer-events-none bg-slate-900 text-slate-700 outline-0',
              discoursemeId !== undefined &&
                'outline outline-1 outline-current',
            )}
            style={{
              // transform: `translate(-50%, -50%)`,
              fontSize: `${12 + 20 * word.score}px`,
              width: word.displayWidth,
              height: word.displayHeight - 6,
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
        </KeepScale>
      </div>

      {!word.isBackground && (
        <div
          className="pointer-events-none absolute z-[500] hidden"
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
