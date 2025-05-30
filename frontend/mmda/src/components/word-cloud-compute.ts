export function calculateWordDimensions(
  word: string,
  score: number,
): [number, number] {
  const baseWidth = word.length * (10 + 10 * score)
  const baseHeight = 20 + score * 20
  return [baseWidth, baseHeight]
}

export class CloudItem {
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

  constructor(
    x: number,
    y: number,
    item: string,
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
  displayWidth: number = 0
  displayHeight: number = 0
  zoomPositions: Map<number, [number, number]> = new Map()

  constructor(
    x: number,
    y: number,
    item: string,
    options?: {
      originX?: number
      originY?: number
      isBackground?: boolean
      score?: number
    },
  ) {
    super(x, y, item, options)
    ;[this.displayWidth, this.displayHeight] = calculateWordDimensions(
      item,
      options?.score ?? 0,
    )
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
      score?: number
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
  #repelForceFactor: number
  enableHomeForce = true
  enableCollisionDetection = true
  stableZoom = new Set<number>()
  #simulationUpdateCallbacks: (() => void)[] = []
  #isSimulatingUntilStable = false
  #runSimulationAgain = false

  constructor(
    width: number,
    height: number,
    words: Word[] = [],
    {
      backgroundCutOff = 0.5,
      enableHomeForce = true,
      enableCollisionDetection = true,
      repelForceFactor = 0.05,
    } = {},
  ) {
    this.width = width
    this.height = height
    this.words = words.toSorted((a, b) => b.score - a.score)
    this.words.forEach((word, index) => {
      word.index = index
      word.isBackground = word.score < backgroundCutOff
    })
    this.enableHomeForce = enableHomeForce
    this.enableCollisionDetection = enableCollisionDetection
    this.#repelForceFactor = repelForceFactor
    this.tick()
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

  #simulateCollisions() {
    for (let i = 0; i < this.words.length; i++) {
      const wordA = this.words[i]
      if (wordA.isBackground || !wordA.hasCollision) continue

      for (let j = i + 1; j < this.words.length; j++) {
        const wordB = this.words[j]
        if (
          wordB.isBackground ||
          !wordB.hasCollision ||
          (wordA.isFixed && wordB.isFixed)
        )
          continue

        if (this.overlaps(wordA, wordB)) {
          const dx = wordB.x - wordA.x
          const dy = wordB.y - wordA.y

          if (!wordA.isFixed) {
            const scaleFactorA = wordA.score > wordB.score * 2 ? 0.5 : 1
            wordA.deltaX -= dx * this.#repelForceFactor * scaleFactorA
            wordA.deltaY -= dy * this.#repelForceFactor * scaleFactorA
          }
          if (!wordB.isFixed) {
            const scaleFactorB = wordB.score > wordA.score * 2 ? 0.5 : 1
            wordB.deltaX += dx * this.#repelForceFactor * scaleFactorB
            wordB.deltaY += dy * this.#repelForceFactor * scaleFactorB
          }

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
      if (word.isFixed) return
      word.applyDelta()
    })
  }

  destroy() {
    this.#isRunning = false
    this.words = []
    this.#ticks = 0
    this.#simulationUpdateCallbacks = []
    this.stableZoom.clear()
  }

  simulateUntilStable() {
    if (this.#isSimulatingUntilStable) {
      this.#runSimulationAgain = true
      return
    }
    this.#simulateUntilStableLoop()
  }

  // TODO: Refactor all of this to be just one loop that takes in updates from the outside
  async #simulateUntilStableLoop() {
    if (this.#isSimulatingUntilStable) {
      throw new Error('Simulation is already running')
    }
    this.#isSimulatingUntilStable = true
    if (this.stableZoom.has(this.#zoom)) {
      for (const word of this.words) {
        const position = word.zoomPositions.get(this.#zoom)
        if (position) {
          word.x = position[0]
          word.y = position[1]
        } else {
          word.x = word.originX
          word.y = word.originY
        }
      }
      this.#isSimulatingUntilStable = false
      this.#simulationUpdateCallbacks.forEach((callback) => callback())
      if (this.#runSimulationAgain) {
        this.#runSimulationAgain = false
        this.#simulateUntilStableLoop()
      }
      return
    }

    const caclulationZoom = this.#zoom

    /*
    This runs in two steps:
    1. First, we simulate the cloud with a higher repel force factor for the 50 largest words.
    2. Then, we simulate the cloud with a lower repel force factor for all words. The 50 largest words are fixed in place to avoid them being moved around.
    This tries to ensure that the most important items don't veer off too much from their original positions
    */
    this.#isRunning = false
    this.#alpha = 1
    this.#ticks = 0

    this.words.forEach((word) => {
      word.deltaX = 0
      word.deltaY = 0
      word.isColliding = false
      word.hasNearbyElements = false
      word.x = word.originX
      word.y = word.originY
      word.hasCollision = (word?.index ?? Infinity) <= 50
      word.isFixed = false
    })

    this.#repelForceFactor = 0.1
    while (this.#alpha > 0.0001 && this.#ticks < 5_000) {
      if (this.#ticks % 10 === 0) {
        // Put the resumption of the loop on the task queue
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (this.#zoom !== caclulationZoom) {
          this.#isSimulatingUntilStable = false
          this.#runSimulationAgain = false
          this.#simulateUntilStableLoop()
          return
        }
      }
      this.#simulate()
      this.#ticks++
    }

    this.#alpha = 1
    this.#ticks = 0

    this.#repelForceFactor = 0.1
    this.words.forEach((word) => {
      word.hasCollision = true
      word.isFixed = (word?.index ?? Infinity) <= 50
    })

    while (this.#alpha > 0.00001 && this.#ticks < 10_000) {
      if (this.#ticks % 10 === 0) {
        // Put the resumption of the loop on the task queue
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (this.#zoom !== caclulationZoom) {
          this.#isSimulatingUntilStable = false
          this.#runSimulationAgain = false
          this.#simulateUntilStableLoop()
          return
        }
      }
      if (this.#ticks % 100 === 0) {
        this.#simulationUpdateCallbacks.forEach((callback) => callback())
      }
      this.#simulate()
      this.#ticks++
    }

    this.stableZoom.add(this.#zoom)
    this.words.forEach((word) => {
      word.isFixed = false
      word.hasCollision = true
      word.zoomPositions.set(this.#zoom, [word.x, word.y])
    })

    this.#isSimulatingUntilStable = false
    this.#simulationUpdateCallbacks.forEach((callback) => callback())
    if (this.#runSimulationAgain) {
      this.#runSimulationAgain = false
      this.#simulateUntilStableLoop()
    }
  }

  tick() {
    if (this.#isRunning) {
      this.#ticks++
      this.#simulate()
    }
    requestAnimationFrame(() => this.tick())
  }
}
