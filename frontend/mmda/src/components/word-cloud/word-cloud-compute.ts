export function calculateWordDimensions(
  word: string,
  score: number,
): [number, number] {
  const baseWidth = word.length * (10 + 10 * score) + 14
  const baseHeight = 20 + score * 20
  return [baseWidth, baseHeight]
}

export class CloudItem {
  id: string
  originX: number
  originY: number
  x: number
  y: number
  label: string
  deltaX: number = 0
  deltaY: number = 0
  /**
   * A fixed item cannot be moved by the simulation, but may still affect other items.
   */
  isFixed: boolean = false
  /**
   * Indicates if this item has a collision with another item.
   */
  hasCollision: boolean = false
  hasNearbyElements: boolean = false
  isColliding: boolean = false
  /**
   * Indicates if this item is a background item that should not be moved by the simulation.
   * They are automatically non-colliding and have a fixed position.
   */
  isBackground: boolean = false
  /**
   * Relative score of the item, must be between 0 and 1.
   */
  score: number = 1
  index?: number
  zoomPositions: Map<number, [number, number]> = new Map()

  constructor(
    x: number,
    y: number,
    item: string,
    id: string,
    {
      originX,
      originY,
      isBackground,
      score = 0,
    }: {
      originX?: number
      originY?: number
      isBackground?: boolean
      score?: number
    } = {},
  ) {
    this.id = id
    this.originX = originX ?? x
    this.originY = originY ?? y
    this.x = x
    this.y = y
    this.label = item
    this.isBackground = isBackground ?? false
    this.score = score
    if (score < 0 || score > 1) {
      throw new Error('Score must be between 0 and 1')
    }
  }

  applyFactor(alpha: number) {
    this.deltaX *= alpha
    this.deltaY *= alpha
  }

  applyDelta() {
    this.x += this.deltaX
    this.y += this.deltaY
    this.deltaX = 0
    this.deltaY = 0
  }
}

export class Word extends CloudItem {
  readonly displayWidth: number = 0
  readonly displayHeight: number = 0

  constructor(
    x: number,
    y: number,
    item: string,
    id: string,
    options?: {
      originX?: number
      originY?: number
      isBackground?: boolean
      score?: number
    },
  ) {
    super(x, y, item, id, options)
    ;[this.displayWidth, this.displayHeight] = calculateWordDimensions(
      item,
      options?.score ?? 0,
    )
  }
}

export class Discourseme extends CloudItem {
  readonly displayWidth: number = 0
  readonly displayHeight: number = 0
  readonly discoursemeId: number

  constructor(
    x: number,
    y: number,
    item: string,
    id: string,
    discoursemeId: number,
    options?: {
      originX?: number
      originY?: number
      score?: number
    },
  ) {
    super(x, y, item, id, options)
    this.discoursemeId = discoursemeId
    ;[this.displayWidth, this.displayHeight] = calculateWordDimensions(
      item,
      options?.score ?? 0,
    )
  }
}

export class Cloud {
  width: number
  height: number
  words: Word[]
  discoursemes: Discourseme[] = []
  #allItems: CloudItem[] = []
  displayWidth = 0
  displayHeight = 0
  #alpha = 1
  #ticks = 0
  #zoom = 1
  #maxZoom
  #repelForceFactor: number
  enableCollisionDetection = true
  stableZoom = new Set<number>()
  #simulationUpdateCallbacks: (() => void)[] = []
  #abortController: AbortController | null = null
  #isSettingUp = true
  #isDestroyed = false

  constructor(
    width: number,
    height: number,
    words: Word[] = [],
    discoursemes: Discourseme[] = [],
    {
      backgroundCutOff = 0.5,
      enableCollisionDetection = true,
      repelForceFactor = 0.05,
      zoom = 1,
      maxZoom = 15,
    } = {},
  ) {
    this.width = width
    this.height = height
    this.words = words.toSorted((a, b) => b.score - a.score)
    this.words.forEach((word, index) => {
      word.index = index
      word.isBackground = word.score < backgroundCutOff
    })
    this.discoursemes = discoursemes.toSorted((a, b) => b.score - a.score)
    this.discoursemes.forEach((discourseme, index) => {
      discourseme.index = index
    })
    this.#allItems = [...this.words, ...this.discoursemes]
    this.enableCollisionDetection = enableCollisionDetection
    this.#repelForceFactor = repelForceFactor
    this.#zoom = zoom
    this.#maxZoom = maxZoom
    void this.#initialSimulation()
  }

  set backgroundCutOff(value: number) {
    this.stableZoom.clear()
    this.words.forEach((word) => {
      word.isBackground = word.score < value
    })
    this.#simulationUpdateCallbacks.forEach((callback) => callback())
  }

  set zoom(value: number) {
    this.#zoom = value
    this.#alpha = 1
    this.#ticks = 0
    if (!this.#isSettingUp) {
      void this.#simulateUntilStable()
    }
  }

  get zoom() {
    return this.#zoom
  }

  onSimulationUpdate(callback: () => void) {
    this.#simulationUpdateCallbacks.push(callback)
    return () => {
      this.#simulationUpdateCallbacks = this.#simulationUpdateCallbacks.filter(
        (cb) => cb !== callback,
      )
    }
  }

  setDisplaySize(displayWidth: number, displayHeight: number) {
    this.displayWidth = displayWidth
    this.displayHeight = displayHeight
    if (!this.#isSettingUp) {
      void this.#simulateUntilStable()
    }
  }

  toDisplayCoordinates(x: number, y: number): [number, number] {
    return [
      (x / this.width) * this.displayWidth,
      (y / this.height) * this.displayHeight,
    ]
  }

  hasNearbyElements(
    wordA: Word,
    wordB: Word,
    distanceFactor = 2,
    zoom: number,
  ): boolean {
    distanceFactor /= zoom
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

  overlaps(wordA: Word, wordB: Word, zoom: number): boolean {
    return this.hasNearbyElements(wordA, wordB, 1, zoom)
  }

  #simulateHomeForce() {
    const decayTicks = 60 * 3 // 3 seconds
    const decayFactor = (decayTicks - this.#ticks) / decayTicks
    if (decayFactor <= 0) return

    for (const word of this.words) {
      if (word.isFixed) continue
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

  #simulateCollisions(zoom: number) {
    for (let i = 0; i < this.#allItems.length; i++) {
      const wordA = this.#allItems[i]
      if (wordA.isBackground || !wordA.hasCollision) continue

      for (let j = i + 1; j < this.#allItems.length; j++) {
        const wordB = this.#allItems[j]
        this.#simulateCollisionBetweenItems(wordA, wordB, zoom)
      }
    }
  }

  #simulateCollisionBetweenItems(
    itemA: CloudItem,
    itemB: CloudItem,
    zoom: number,
  ) {
    if (itemA.isBackground || itemB.isBackground) return
    if (itemA.isFixed && itemB.isFixed) return

    if (this.overlaps(itemA as Word, itemB as Word, zoom)) {
      const dx = itemB.x - itemA.x || 0.01 // if two items are at the same position, we still want to apply a force
      const dy = itemB.y - itemA.y || 0.01 // ^-- this

      if (!itemA.isFixed) {
        const scaleFactorA = itemA.score > itemB.score * 2 ? 0.5 : 1
        itemA.deltaX -= dx * this.#repelForceFactor * scaleFactorA
        itemA.deltaY -= dy * this.#repelForceFactor * scaleFactorA
      }
      if (!itemB.isFixed) {
        const scaleFactorB = itemB.score > itemA.score * 2 ? 0.5 : 1
        itemB.deltaX += dx * this.#repelForceFactor * scaleFactorB
        itemB.deltaY += dy * this.#repelForceFactor * scaleFactorB
      }

      itemA.isColliding = true
      itemB.isColliding = true
      itemA.hasNearbyElements = true
      itemB.hasNearbyElements = true
    } else if (this.hasNearbyElements(itemA as Word, itemB as Word, 1, zoom)) {
      itemA.hasNearbyElements = true
      itemB.hasNearbyElements = true
    }
  }

  #simulate(zoom: number) {
    for (const item of this.#allItems) {
      item.hasNearbyElements = false
      item.isColliding = false
    }

    if (this.enableCollisionDetection) {
      this.#simulateCollisions(zoom)
    }

    // determine if we should slow down
    const averageDelta =
      this.#allItems.reduce(
        (acc, word) => acc + Math.abs(word.deltaX) + Math.abs(word.deltaY),
        0,
      ) / this.words.length
    // to avoid flickering, we only slow down if the average delta is small or after about 5 seconds
    if (averageDelta < 1 || this.#ticks > 60 * 5) {
      this.#alpha *= 0.99
    }

    // apply slowdown factor
    this.#allItems.forEach((item) => {
      item.applyFactor(this.#alpha)
    })

    // apply home force which is NOT affected by the slowdown factor
    this.#simulateHomeForce()

    // apply forces to each word
    this.#allItems.forEach((item) => {
      if (item.isFixed) return
      item.applyDelta()
    })
  }

  destroy() {
    this.#abortController?.abort()
    this.#isDestroyed = true
    this.words = []
    this.#ticks = 0
    this.#simulationUpdateCallbacks = []
    this.stableZoom.clear()
  }

  #publishPositions() {
    this.#simulationUpdateCallbacks.forEach((callback) => callback())
  }

  // Simulate the word cloud to a stable state, starting with a zoom of 1 and then zooming out to the maximum zoom level.
  async #initialSimulation() {
    await this.#simulateUntilStable(1)
    const currentzoom = this.#zoom
    await this.#simulateUntilStable(this.#maxZoom ?? 15)
    this.#isSettingUp = false
    this.zoom = currentzoom // reset to the initial zoom level
  }

  #applyPositionCache(zoom = this.#zoom) {
    if (this.stableZoom.has(zoom)) {
      this.#allItems.forEach((item) => {
        const cachedPosition = item.zoomPositions.get(zoom)
        if (cachedPosition) {
          item.x = cachedPosition[0]
          item.y = cachedPosition[1]
        } else {
          console.warn(
            `No cached position found for item ${item.id} at zoom level ${zoom}`,
          )
          item.x = item.originX
          item.y = item.originY
        }
      })
      return true
    }
    return false
  }

  #cachePositions(zoom: number = this.#zoom) {
    this.#allItems.forEach((item) => {
      item.zoomPositions.set(zoom, [item.x, item.y])
    })
    this.stableZoom.add(zoom)
  }

  #applyInterpolatedPosition(zoom: number = this.#zoom) {
    const closestLowerZoom: number = Math.max(
      ...Array.from(this.stableZoom).filter((z) => z <= zoom),
    )
    const closestHigherZoom = Math.min(
      ...Array.from(this.stableZoom).filter((z) => z >= zoom),
    )
    this.#allItems.forEach((item) => {
      const lowerPosition = item.zoomPositions.get(closestLowerZoom)
      const higherPosition = item.zoomPositions.get(closestHigherZoom)
      if (lowerPosition && higherPosition) {
        const factor =
          (zoom - closestLowerZoom) / (closestHigherZoom - closestLowerZoom)
        item.x =
          lowerPosition[0] + factor * (higherPosition[0] - lowerPosition[0])
        item.y =
          lowerPosition[1] + factor * (higherPosition[1] - lowerPosition[1])
      } else {
        console.warn(
          `No cached position found for item ${item.id} at zoom level ${zoom}`,
        )
        item.x = item.originX
        item.y = item.originY
      }
    })
    this.#publishPositions()
  }

  async #simulateUntilStable(zoom = this.#zoom, publishAfterSimulation = true) {
    if (this.#isDestroyed) return
    this.#abortController?.abort()
    if (this.#applyPositionCache(zoom)) {
      this.#publishPositions()
      return
    }
    this.#applyInterpolatedPosition(zoom)
    const abortController = new AbortController()
    this.#abortController = abortController

    try {
      // Step 1: Simulate the discoursemes only
      this.#alpha = 1
      this.#ticks = 0
      this.discoursemes.forEach((discourseme) => {
        discourseme.deltaX = 0
        discourseme.deltaY = 0
        discourseme.isColliding = true
        discourseme.hasNearbyElements = false
        discourseme.x = discourseme.originX
        discourseme.y = discourseme.originY
        discourseme.hasCollision = true
        discourseme.isFixed = false
      })
      this.words.forEach((word) => {
        word.deltaX = 0
        word.deltaY = 0
        word.isColliding = false
        word.hasNearbyElements = false
        word.x = word.originX
        word.y = word.originY
        word.hasCollision = false
        word.isFixed = true
      })

      await this.#simulateUntilStableLoop(
        zoom,
        abortController.signal,
        0.001,
        1_000,
      )

      // Step 2: Simulate the words with a higher repel force factor for the 50 largest words
      this.#alpha = 1
      this.#ticks = 0

      this.discoursemes.forEach((discourseme) => {
        discourseme.isFixed = true
      })
      this.words.forEach((word) => {
        word.hasCollision = (word?.index ?? Infinity) <= 50
        word.isFixed = false
      })

      this.#repelForceFactor = 0.1

      await this.#simulateUntilStableLoop(
        zoom,
        abortController.signal,
        0.001,
        3_000,
      )

      // Step 3: Simulate the words with a lower repel force factor for all words, fixing the 50 largest words
      this.#alpha = 1
      this.#ticks = 0

      this.#repelForceFactor = 0.1
      this.words.forEach((word) => {
        word.hasCollision = true
        word.isFixed = (word?.index ?? Infinity) <= 50
      })

      await this.#simulateUntilStableLoop(
        zoom,
        abortController.signal,
        0.01,
        5_000,
      )

      this.#cachePositions(zoom)
      if (publishAfterSimulation) {
        this.#publishPositions()
      }
    } catch (e) {
      if (!(e instanceof AbortError)) {
        console.error('Error during simulation:', e)
      }
    } finally {
      if (this.#abortController === abortController) {
        this.#abortController = null
      }
    }
  }

  /**
   * Simulates the word cloud until it is stable, meaning the alpha value is below the threshold or the ticks exceed the threshold.
   * @param abortSignal If provided, the simulation will be aborted if the signal is aborted. If nnull, the simulation will run until it is stable and will will block the event loop.
   * @param alphaThreshold
   * @param ticksThreshold
   */
  async #simulateUntilStableLoop(
    zoom: number,
    abortSignal: AbortSignal | null,
    alphaThreshold = 0.01,
    ticksThreshold = 5_000,
  ) {
    let cycles = 0
    while (this.#alpha > alphaThreshold && this.#ticks < ticksThreshold) {
      this.#simulate(zoom)
      this.#ticks++
      // Check if the simulation has been aborted
      if (abortSignal && cycles++ % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      // Put the resumption of the loop on the task queue
      if (abortSignal?.aborted) {
        throw new AbortError()
      }
    }
  }
}

class AbortError extends Error {
  constructor() {
    super('Simulation aborted')
    this.name = 'AbortError'
  }
}
