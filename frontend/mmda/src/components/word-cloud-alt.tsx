import { useEffect, useRef, useState } from 'react'
import {
  TransformWrapper,
  TransformComponent,
  KeepScale,
} from 'react-zoom-pan-pinch'

import { cn } from '@cads/shared/lib/utils'

export function WordCloudAlt({
  cloud,
  debug = false,
}: {
  cloud: Cloud
  debug?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    if (!cloud.displayHeight) {
      const { width, height } = container.getBoundingClientRect()
      cloud.displayWidth = width
      cloud.displayHeight = height
    }
    cloud.zoom = zoom
  }, [cloud, zoom])

  return (
    <div className="relative aspect-[2/1]">
      <TransformWrapper
        initialScale={1}
        onZoom={(event) => {
          setZoom(event.instance.transformState.scale)
        }}
        wheel={{ step: 0.1, smoothStep: 0.001 }}
        panning={{ velocityDisabled: true }}
        limitToBounds
        smooth
        minPositionX={0}
      >
        <TransformComponent contentClass="w-full" wrapperClass="w-full">
          <div
            className="relative w-full min-w-[500px] outline outline-1 outline-yellow-300"
            style={{
              aspectRatio: `${cloud.width} / ${cloud.height}`,
            }}
            ref={ref}
          >
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${cloud.width} ${cloud.height}`}
            >
              {cloud.words.map((word) => (
                <HomeLine key={word.label} word={word} />
              ))}
            </svg>

            {cloud.words.map((word) => (
              <Item word={word} cloud={cloud} key={word.label} debug={debug} />
            ))}

            {debug && (
              <div className="absolute left-2 top-2 z-40 bg-black/50">
                Zoom: {zoom.toFixed(2)}
              </div>
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}

function HomeLine({ word }: { word: Word }) {
  const [key, setKey] = useState(0)
  useEffect(
    () =>
      word.subscribe(() => {
        setKey((prev) => (prev + 1) % 1000) // Update key to force re-render
      }),
    [word],
  )
  return (
    <line
      key={key}
      data-for-word={word.label}
      x1={word.originX}
      y1={word.originY}
      x2={word.x}
      y2={word.y}
      className="stroke-blue-500 stroke-[1px]"
      vectorEffect="non-scaling-stroke"
    />
  )
}

function Item({
  word,
  cloud,
  debug = false,
}: {
  word: Word
  cloud: Cloud
  debug?: boolean
}) {
  const [[x, y], setPosition] = useState([word.x, word.y])

  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const unsubscribe = word.subscribe(() => {
      setPosition([word.x, word.y])
    })
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect()
      word.displayWidth = width
      word.displayHeight = height
    }
    return unsubscribe
  }, [word])

  const [displayX, displayY] = cloud.toDisplayCoordinates(x, y)
  const [displayOriginX, displayOriginY] = cloud.toDisplayCoordinates(
    word.originX,
    word.originY,
  )

  return (
    <>
      <div
        className={cn(
          'absolute left-0 top-0 transition-transform duration-500 hover:z-20 [&:hover+*]:block',
          word.isBackground ? 'z-0' : 'z-10',
        )}
        style={{
          translate: `calc(${displayX}px - 50%) calc(${displayY}px - 50%)`,
        }}
      >
        <KeepScale>
          <span
            ref={ref}
            className={cn(
              'hover:bg-primary absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none text-nowrap rounded-md bg-slate-600 px-2 text-slate-300 outline outline-2 outline-transparent',
              debug && word.hasNearbyElements && 'outline-yellow-800',
              debug && word.isColliding && 'bg-red-700',
              word.isBackground &&
                'pointer-events-none bg-slate-900 text-slate-700 outline-0',
            )}
            style={{
              // transform: `translate(-50%, -50%)`,
              fontSize: `${12 + 12 * word.scale}px`,
            }}
          >
            {word.label}
            {debug && !word.isBackground && (
              <span className="pointer-events-none absolute left-0 top-0 h-full w-full scale-[2] outline-dotted outline-[1px] outline-gray-600" />
            )}
          </span>
        </KeepScale>
      </div>

      {!word.isBackground && (
        <div
          className="pointer-events-none absolute z-30 hidden"
          style={{
            left: displayOriginX,
            top: displayOriginY,
          }}
        >
          <KeepScale>
            <span className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-500" />
              <span className="absolute left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-emerald-500" />
            </span>
          </KeepScale>
        </div>
      )}
    </>
  )
}

export class CloudItem {
  originX: number
  originY: number
  x: number
  y: number
  label: string
  deltaX: number = 0
  deltaY: number = 0
  callbacks: (() => void)[] = []
  hasNearbyElements: boolean = false
  isColliding: boolean = false
  isBackground: boolean = false
  scale: number = 1

  constructor(
    x: number,
    y: number,
    item: string,
    {
      originX,
      originY,
      isBackground,
      scale = 0,
    }: {
      originX?: number
      originY?: number
      isBackground?: boolean
      scale?: number
    } = {},
  ) {
    this.originX = originX ?? x
    this.originY = originY ?? y
    this.x = x
    this.y = y
    this.label = item
    this.isBackground = isBackground ?? false
    this.scale = scale
  }

  applyFactor(alpha: number) {
    this.deltaX *= alpha
    this.deltaY *= alpha
  }

  applyDelta() {
    this.x += this.deltaX
    this.y += this.deltaY
    this.callbacks.forEach((callback) => callback())
    this.deltaX = 0
    this.deltaY = 0
  }

  subscribe = (callback: () => void) => {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }
}

export class Word extends CloudItem {
  displayWidth: number = 0
  displayHeight: number = 0

  constructor(
    x: number,
    y: number,
    item: string,
    options?: {
      originX?: number
      originY?: number
      isBackground?: boolean
      scale?: number
    },
  ) {
    super(x, y, item, options)
  }
}

export class Discourseme extends CloudItem {
  radius: number = 20

  constructor(
    x: number,
    y: number,
    item: string,
    options?: {
      originX?: number
      originY?: number
      isBackground?: boolean
      scale?: number
    },
  ) {
    super(x, y, item, options)
  }
}

export class Cloud {
  width: number
  height: number
  words: Word[]
  #isRunning = true
  displayWidth = 0
  displayHeight = 0
  #alpha = 1
  #ticks = 0
  #zoom = 1
  #repelForceFactor = 1
  enableHomeForce = true
  enableCollisionDetection = true

  constructor(
    width: number,
    height: number,
    words: Word[] = [],
    {
      enableHomeForce = true,
      enableCollisionDetection = true,
      repelForceFactor = 1,
    } = {},
  ) {
    this.width = width
    this.height = height
    this.words = words
    this.enableHomeForce = enableHomeForce
    this.enableCollisionDetection = enableCollisionDetection
    this.#repelForceFactor = repelForceFactor
    this.tick()
  }

  set zoom(value: number) {
    this.#zoom = value
    this.#alpha = 1
    this.#ticks = 0
  }

  setDisplaySize(displayWidth: number, displayHeight: number) {
    this.displayWidth = displayWidth
    this.displayHeight = displayHeight
  }

  toDisplayCoordinates(x: number, y: number): [number, number] {
    return [
      (x / this.width) * this.displayWidth,
      (y / this.height) * this.displayHeight,
    ]
  }

  hasNearbyElements(wordA: Word, wordB: Word, distanceFactor = 2): boolean {
    distanceFactor /= this.#zoom
    const [displayX1, displayY1] = this.toDisplayCoordinates(wordA.x, wordA.y)
    const [displayX2, displayY2] = this.toDisplayCoordinates(wordB.x, wordB.y)
    const thisLeft = displayX1 - (wordA.displayWidth / 2) * distanceFactor
    const otherRight = displayX2 + (wordB.displayWidth / 2) * distanceFactor
    if (thisLeft > otherRight) return false

    const otherLeft = displayX2 - (wordB.displayWidth / 2) * distanceFactor
    const thisRight = displayX1 + (wordA.displayWidth / 2) * distanceFactor
    if (thisRight < otherLeft) return false

    const thisTop = displayY1 - (wordA.displayHeight / 2) * distanceFactor
    const otherBottom = displayY2 + (wordB.displayHeight / 2) * distanceFactor
    if (thisTop > otherBottom) return false

    const thisBottom = displayY1 + (wordA.displayHeight / 2) * distanceFactor
    const otherTop = displayY2 - (wordB.displayHeight / 2) * distanceFactor
    return thisBottom > otherTop
  }

  overlaps(wordA: Word, wordB: Word): boolean {
    return this.hasNearbyElements(wordA, wordB, 1)
  }

  #simulateHomeForce() {
    const decayTicks = 60 * 3 // 3 seconds
    const decayFactor = (decayTicks - this.#ticks) / decayTicks
    if (decayFactor <= 0) return

    for (const word of this.words) {
      // calculate the distance to the home position
      const dx = word.originX - word.x
      const dy = word.originY - word.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // apply a force towards the home position
      if (distance > 50 / this.#zoom) {
        const force = 5 * decayFactor
        word.deltaX += (dx / distance) * force
        word.deltaY += (dy / distance) * force
      }
    }
  }

  #simulateCollisions() {
    for (let i = 0; i < this.words.length; i++) {
      const wordA = this.words[i]
      if (wordA.isBackground) continue

      for (let j = i + 1; j < this.words.length; j++) {
        const wordB = this.words[j]
        if (wordB.isBackground) continue

        if (this.overlaps(wordA, wordB)) {
          const dx = wordB.x - wordA.x
          const dy = wordB.y - wordA.y
          wordA.deltaX -= dx * 0.1 * this.#repelForceFactor
          wordB.deltaX += dx * 0.1 * this.#repelForceFactor
          wordA.deltaY -= dy * 0.1 * this.#repelForceFactor
          wordB.deltaY += dy * 0.1 * this.#repelForceFactor
          wordA.isColliding = true
          wordB.isColliding = true
          wordA.hasNearbyElements = true
          wordB.hasNearbyElements = true
        } else if (this.hasNearbyElements(wordA, wordB)) {
          wordA.hasNearbyElements = true
          wordB.hasNearbyElements = true
        }
      }
    }
  }

  #simulate() {
    // if (this.#alpha < 0.000001) {
    //   return
    // }

    for (const word of this.words) {
      word.hasNearbyElements = false
      word.isColliding = false
    }

    if (this.enableCollisionDetection) {
      this.#simulateCollisions()
    }

    // determine if we should slow down
    const averageDelta =
      this.words.reduce(
        (acc, word) => acc + Math.abs(word.deltaX) + Math.abs(word.deltaY),
        0,
      ) / this.words.length
    // to avoid flickering, we only slow down if the average delta is small or after about 5 seconds
    if (averageDelta < 1 || this.#ticks > 60 * 5) {
      this.#alpha *= 0.99
    }

    // apply slowdown factor
    this.words.forEach((word) => {
      word.applyFactor(this.#alpha)
    })

    // apply home force which is NOT affected by the slowdown factor
    if (this.enableHomeForce) {
      this.#simulateHomeForce()
    }

    // apply forces to each word
    this.words.forEach((word) => {
      word.applyDelta()
    })
  }

  destroy() {
    this.#isRunning = false
    this.words = []
    this.#ticks = 0
  }

  tick() {
    if (this.#isRunning) {
      this.#ticks++
      this.#simulate()
    }
    requestAnimationFrame(() => this.tick())
  }
}
