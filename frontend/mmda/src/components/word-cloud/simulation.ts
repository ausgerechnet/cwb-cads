export interface CloudItem {
  readonly id: string
  /**
   * The width of the displayed item in the word cloud.
   */
  readonly displayWidth: number
  /**
   * The height of the displayed item in the word cloud.
   */
  readonly displayHeight: number
  /**
   * The actual x position of the item within the word cloud
   */
  originX: number
  /**
   * The actual y position of the item within the word cloud
   */
  originY: number
  /**
   * The x position of the item within the word cloud after the simulation has run.
   */
  x: number
  /**
   * The y position of the item within the word cloud after the simulation has run.
   */
  y: number
  label: string
  deltaX: number
  deltaY: number
  /**
   * A fixed item cannot be moved by the simulation, but may still affect other items.
   */
  isFixed: boolean
  /**
   * Indicates if this item is currently colliding with one or more other items.
   */
  hasCollision: boolean
  /**
   * Indicates if this item has nearby elements
   */
  hasNearbyElements: boolean
  /**
   * Indicates if this item MAY collide with other items.
   */
  isColliding: boolean
  /**
   * Indicates if this item is a background item that should not be moved by the simulation.
   * They are automatically non-colliding and have a fixed position.
   */
  isBackground: boolean
  /**
   * Relative score of the item, must be between 0 and 1.
   */
  score: number
  index?: number
}

export interface Word extends CloudItem {
  type: 'word'
}

export interface Discourseme extends CloudItem {
  type: 'discourseme'
  isBackground: false
  readonly discoursemeId: number
}

export class Simulation {
  /**
   * There is one simulation per zoom factor. This keeps things simpler as a user can quickly zoom in and out and we might want to cache progress within the simulation for each zoom factor.
   */
  readonly zoom
  /**
   * The width of the original coordinate space. Its's 2, because x ranges from -1 to 1
   */
  readonly #width = 2
  /**
   * The height of the original coordinate space. It's 2, because y ranges from -1 to 1
   */
  readonly #height = 2
  /**
   * The cut-off value for background items. Items with a score below this value are considered background items and will not be moved by the simulation.
   */
  #cutOff: number = 0.5
  /**
   * The width of the display area
   */
  #displayWidth: number
  /**
   * The height of the display area
   */
  #displayHeight: number
  #words: Word[]
  #discoursemes: Discourseme[]
  /**
   * All items in the simulation, including words and discoursemes.
   */
  #allItems: CloudItem[] = []
  #alpha = 1
  #ticks = 0
  #repelForceFactor: number = 0.05
  #enableCollisionDetection = true
  #isRunning = false
  /**
   * The current state of the simulation step.
   * - `none`: No simulation step is currently running
   * - `discoursemes`: The simulation is currently processing discoursemes
   * - `important`: The simulation is currently processing important words (top 50)
   * - `all`: The simulation is currently processing the remaining words
   */
  #simulationStepState: 'none' | 'discoursemes' | 'important' | 'all' = 'none'
  /**
   * The current state of the simulation.
   * - `pending`: The simulation hasn't been started or stable yet
   * - `stable`: The simulation is stable and no further changes are expected
   * - `dirty`: The simulation has been modified and needs to be recalculated; the 'dirty' state can be displayed as an intermediate result
   */
  #state: 'pending' | 'stable' | 'dirty' = 'pending'
  #startTime: number = 0
  #stableDuration: number = 0
  #onStable: (simulation: Simulation) => void // A simulation has only one observer

  constructor(
    displayWidth: number,
    displayHeight: number,
    words: Word[],
    discoursemes: Discourseme[],
    zoom: number,
    backgroundCutOff: number,
    onStable: (simulation: Simulation) => void,
  ) {
    this.#displayWidth = displayWidth
    this.#displayHeight = displayHeight
    this.#words = words.toSorted((a, b) => b.score - a.score)
    this.#discoursemes = discoursemes.toSorted((a, b) => b.score - a.score)
    this.#allItems = [...this.#words, ...this.#discoursemes]
    this.#words.forEach((word) => {
      word.isBackground = word.score < backgroundCutOff
    })
    this.#cutOff = backgroundCutOff
    this.zoom = zoom
    this.#onStable = onStable
    this.#loop()
  }

  get state() {
    return this.#state
  }

  get isRunning() {
    return this.#isRunning
  }

  get stableDuration() {
    return this.#stableDuration
  }

  start() {
    if (this.#isRunning) return
    this.#startTime = Date.now()
    this.#isRunning = true
  }

  stop() {
    if (!this.#isRunning) return
    this.#isRunning = false
  }

  set cutOff(cutOff: number) {
    let didChange = false
    this.#cutOff = cutOff
    this.#words.forEach((word) => {
      const isBackground = word.score < cutOff
      if (word.isBackground !== isBackground) {
        word.isBackground = isBackground
        didChange = true
      }
    })
    if (didChange && this.#state !== 'pending') {
      this.#state = 'dirty'
    }
  }

  set displaySize([displayWidth, displayHeight]: [number, number]) {
    if (
      this.#displayWidth !== displayWidth ||
      this.#displayHeight !== displayHeight
    ) {
      this.#displayWidth = displayWidth
      this.#displayHeight = displayHeight
      this.#state = 'dirty'
    }
  }

  get words() {
    return this.#words
  }

  set words(updateWords: Word[]) {
    let didChange = false

    for (const word of updateWords) {
      const existingWord = this.#words.find((w) => w.id === word.id)
      if (existingWord) {
        // This operates under the assumption that only the word's position will change
        if (
          word.originX !== existingWord.originX ||
          word.originY !== existingWord.originY
        ) {
          existingWord.x = word.originX
          existingWord.y = word.originY
          existingWord.originX = word.originX
          existingWord.originY = word.originY
          didChange = true
        }
      } else {
        this.#words.push({ ...word, isBackground: word.score < this.#cutOff })
        didChange = true
      }
    }

    // Remove words that are no longer present
    const currentWordCount = this.#words.length
    this.#words = this.#words.filter((word) =>
      updateWords.some((w) => w.id === word.id),
    )
    didChange ||= this.#words.length !== currentWordCount
    this.#words.sort((a, b) => b.score - a.score)
    this.#allItems = [...this.#words, ...this.#discoursemes]

    if (didChange) {
      this.#state = 'dirty'
    }
  }

  get discoursemes() {
    return this.#discoursemes
  }

  set discoursemes(updateDiscoursemes: Discourseme[]) {
    let didChange = false
    for (const discourseme of updateDiscoursemes) {
      const existingDiscourseme = this.#discoursemes.find(
        (d) => d.id === discourseme.id,
      )
      if (existingDiscourseme) {
        // This operates under the assumption that only the discourseme's position will change
        if (
          discourseme.originX !== existingDiscourseme.originX ||
          discourseme.originY !== existingDiscourseme.originY
        ) {
          existingDiscourseme.x = discourseme.originX
          existingDiscourseme.y = discourseme.originY
          existingDiscourseme.originX = discourseme.originX
          existingDiscourseme.originY = discourseme.originY
          didChange = true
        }
      } else {
        this.#discoursemes.push({ ...discourseme })
        didChange = true
      }
    }
    // Remove discoursemes that are no longer present
    const currentDiscoursemeCount = this.#discoursemes.length
    this.#discoursemes = this.#discoursemes.filter((discourseme) =>
      updateDiscoursemes.some((d) => d.id === discourseme.id),
    )
    didChange ||= this.#discoursemes.length !== currentDiscoursemeCount
    this.#discoursemes.sort((a, b) => b.score - a.score)
    this.#allItems = [...this.#words, ...this.#discoursemes]
    if (didChange) {
      this.#simulationStepState = 'none'
      this.#state = 'dirty'
    }
  }

  updateItemPosition(itemId: string, originX: number, originY: number) {
    const item = this.#allItems.find((i) => i.id === itemId)
    if (!item) {
      console.warn(`Item with id ${itemId} not found`)
      return
    }
    if (item.originX === originX && item.originY === originY) {
      return
    }
    item.originX = originX
    item.originY = originY
    item.x = originX
    item.y = originY
    this.#state = 'dirty'
  }

  toDisplayCoordinates(x: number, y: number): [number, number] {
    return [
      (x / this.#width) * this.#displayWidth,
      (y / this.#height) * this.#displayHeight,
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

    for (const word of this.#words) {
      if (word.isFixed) continue
      // calculate the distance to the home position
      const dx = word.originX - word.x
      const dy = word.originY - word.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // apply a force towards the home position
      if (distance > 50 / this.zoom) {
        const force = 5 * decayFactor
        word.deltaX += (dx / distance) * force
        word.deltaY += (dy / distance) * force
      }
    }
  }

  #simulateCollisions() {
    for (let i = 0; i < this.#allItems.length; i++) {
      const wordA = this.#allItems[i]
      if (wordA.isBackground || !wordA.hasCollision) continue

      for (let j = i + 1; j < this.#allItems.length; j++) {
        const wordB = this.#allItems[j]
        this.#simulateCollisionBetweenItems(wordA, wordB, this.zoom)
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

  #simulateStep() {
    for (const item of this.#allItems) {
      item.hasNearbyElements = false
      item.isColliding = false
    }

    if (this.#enableCollisionDetection) {
      this.#simulateCollisions()
    }

    // determine if we should slow down
    const averageDelta =
      this.#allItems.reduce(
        (acc, word) => acc + Math.abs(word.deltaX) + Math.abs(word.deltaY),
        0,
      ) / this.#words.length
    // to avoid flickering, we only slow down if the average delta is small or after about 5 seconds
    if (averageDelta < 1 || this.#ticks > 60 * 5) {
      this.#alpha *= 0.99
    }

    // apply slowdown factor
    this.#allItems.forEach((item) => {
      item.deltaX *= this.#alpha
      item.deltaY *= this.#alpha
    })

    // apply home force which is NOT affected by the slowdown factor
    this.#simulateHomeForce()

    // apply forces to each word
    this.#allItems.forEach((item) => {
      if (item.isFixed) return
      item.x += item.deltaX
      item.y += item.deltaY
      item.deltaX = 0
      item.deltaY = 0
    })
  }

  // This loop will run endlessly. It is assumed that the simulation class is only used within a web worker which is eventually terminated
  async #loop() {
    let alphaThreshold = 0
    let ticksThreshold = Infinity

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (this.#isRunning && this.#state !== 'stable') {
        const isStable =
          this.#alpha <= alphaThreshold || this.#ticks >= ticksThreshold

        // determine whether the current simulation step is done and go on to the next step
        if (this.#simulationStepState === 'none' || this.#state === 'dirty') {
          this.#state = 'pending'
          this.#simulationStepState = 'discoursemes'
          this.#alpha = 1
          this.#ticks = 0
          alphaThreshold = 0.01
          ticksThreshold = 5_000
          this.#discoursemes.forEach((discourseme) => {
            discourseme.deltaX = 0
            discourseme.deltaY = 0
            discourseme.isColliding = true
            discourseme.hasNearbyElements = false
            discourseme.x = discourseme.originX
            discourseme.y = discourseme.originY
            discourseme.hasCollision = true
            discourseme.isFixed = false
          })
          this.#words.forEach((word) => {
            word.deltaX = 0
            word.deltaY = 0
            word.isColliding = false
            word.hasNearbyElements = false
            word.x = word.originX
            word.y = word.originY
            word.hasCollision = false
            word.isFixed = true
          })
        } else if (this.#simulationStepState === 'discoursemes' && isStable) {
          this.#simulationStepState = 'important'
          this.#alpha = 1
          this.#ticks = 0
          alphaThreshold = 0.001
          ticksThreshold = 3_000
          this.#repelForceFactor = 0.1
          this.#discoursemes.forEach((discourseme) => {
            discourseme.isFixed = true
            discourseme.hasCollision = true
          })
          this.#words.forEach((word) => {
            word.hasCollision = (word?.index ?? Infinity) <= 50
            word.isFixed = false
          })
        } else if (this.#simulationStepState === 'important' && isStable) {
          this.#simulationStepState = 'all'
          this.#alpha = 1
          this.#ticks = 0
          alphaThreshold = 0.01
          ticksThreshold = 5_000
          this.#repelForceFactor = 0.05
          this.#words.forEach((word) => {
            word.hasCollision = true
            word.isFixed = (word?.index ?? Infinity) <= 50
          })
        } else if (this.#simulationStepState === 'all' && isStable) {
          this.#simulationStepState = 'none'
          this.#state = 'stable'

          const now = Date.now()
          this.#stableDuration = now - this.#startTime
          this.#onStable(this)
        }

        this.#simulateStep()
        this.#ticks++

        if (this.#ticks % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }
  }
}
