import {
  Simulation,
  type CloudItem,
  type Word,
  type Discourseme,
} from './simulation'

export function calculateWordDimensions(
  word: string,
  score: number,
): [number, number] {
  const baseWidth = word.length * (10 + 10 * score) + 14
  const baseHeight = 20 + score * 20
  return [baseWidth, baseHeight]
}

function createCloutItem(
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
): CloudItem {
  if (score < 0 || score > 1) {
    throw new Error('Score must be between 0 and 1')
  }
  const [displayWidth, displayHeight] = calculateWordDimensions(item, score)
  return {
    id,
    displayWidth,
    displayHeight,
    originX: originX ?? x,
    originY: originY ?? y,
    x,
    y,
    label: item,
    deltaX: 0,
    deltaY: 0,
    isFixed: false,
    hasCollision: false,
    hasNearbyElements: false,
    isColliding: false,
    isBackground: isBackground ?? false,
    score,
  }
}

export function createWord(
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
): Word {
  const cloudItem = createCloutItem(x, y, item, id, options)
  const [displayWidth, displayHeight] = calculateWordDimensions(
    item,
    options?.score ?? 0,
  )
  return {
    type: 'word',
    ...cloudItem,
    displayWidth,
    displayHeight,
  }
}

export function createDiscourseme(
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
): Discourseme {
  const cloudItem = createCloutItem(x, y, item, id, options)
  const [displayWidth, displayHeight] = calculateWordDimensions(
    item,
    options?.score ?? 0,
  )
  return {
    type: 'discourseme',
    ...cloudItem,
    isBackground: false,
    discoursemeId,
    displayWidth,
    displayHeight,
  }
}

export class Cloud {
  stableZoom = new Set<number>()
  #simulationUpdateCallbacks: (() => void)[] = []
  #zoom = 1

  readonly zoomSteps = 0.5
  readonly #simulations: Map<number, Simulation> = new Map()

  constructor(
    displayWidth: number,
    displayHeight: number,
    words: Word[] = [],
    discoursemes: Discourseme[] = [],
    { zoom = 1, backgroundCutOff = 0.5, minZoom = 1, maxZoom = 15 } = {},
  ) {
    if (
      maxZoom < minZoom ||
      Number.isInteger(maxZoom) === false ||
      Number.isInteger(minZoom) === false
    ) {
      throw new Error(
        'maxZoom and zoom must be integers and maxZoom must be greater than or equal to zoom',
      )
    }

    this.#zoom = zoom

    for (let zoom = minZoom; zoom <= maxZoom; zoom += this.zoomSteps) {
      this.#simulations.set(
        zoom,
        new Simulation(
          displayWidth,
          displayHeight,
          words.map((word) => ({ ...word })),
          discoursemes.map((discourseme) => ({
            ...discourseme,
          })),
          zoom,
          backgroundCutOff,
          this.#handleStableSimulation,
        ),
      )
    }

    this.#simulations.get(this.#zoom)!.start()
  }

  set cutOff(cutOff: number) {
    this.#simulations.forEach((simulation) => (simulation.cutOff = cutOff))
    this.#runAppropriateSimulation()
  }

  #handleStableSimulation = (simulation: Simulation) => {
    if (simulation.zoom === this.#zoom) {
      this.#publishPositions()
    }
    this.#runAppropriateSimulation()
  }

  #runAppropriateSimulation() {
    const currentSimulation = this.#simulations.get(this.#zoom)!
    if (currentSimulation.state !== 'stable') {
      currentSimulation.start()
      return
    }

    const unstableSims = Array.from(this.#simulations.values()).filter(
      (sim) => sim.state !== 'stable',
    )
    this.#simulations.forEach((sim) => sim.stop())
    if (unstableSims.length > 0) {
      const closestSim = unstableSims.reduce((prev, curr) => {
        if (curr.zoom === 15 || curr.zoom === 1) return curr // always prefer the highest or lowest zoom level if available
        return Math.abs(curr.zoom - this.#zoom) <
          Math.abs(prev.zoom - this.#zoom)
          ? curr
          : prev
      })
      closestSim.start()
    }
  }

  get simulationStates() {
    return Array.from(this.#simulations.entries()).map(([zoom, sim]) => ({
      zoom,
      state: sim.state,
      isRunning: sim.isRunning,
      stableDuration: sim.stableDuration,
    }))
  }

  set displaySize(displaySize: [number, number]) {
    this.#simulations.forEach(
      (simulation) => (simulation.displaySize = displaySize),
    )
    this.#runAppropriateSimulation()
  }

  set zoom(zoom: number) {
    const nearestValidZoom = Math.round(zoom / this.zoomSteps) * this.zoomSteps

    if (!this.#simulations.has(nearestValidZoom)) {
      throw new Error(
        `No simulation found for zoom level ${nearestValidZoom}. Available zoom levels: ${Array.from(
          this.#simulations.keys(),
        ).join(', ')}`,
      )
    }
    this.#zoom = nearestValidZoom

    const activeSimulation = this.#simulations.get(nearestValidZoom)!
    if (
      activeSimulation.state === 'stable' ||
      activeSimulation.state === 'dirty'
    ) {
      this.#publishPositions()
    }
    if (activeSimulation.state !== 'stable') {
      this.#simulations.forEach((simulation) => {
        simulation.stop()
      })
      activeSimulation.start()
    }
  }

  set words(words: Word[]) {
    this.#simulations.forEach((simulation) => (simulation.words = words))
    this.#runAppropriateSimulation()
  }

  set discoursemes(discoursemes: Discourseme[]) {
    this.#simulations.forEach(
      (simulation) => (simulation.discoursemes = discoursemes),
    )
    this.#runAppropriateSimulation()
  }

  get words() {
    return this.#simulations.get(this.#zoom)?.words ?? []
  }

  get discoursemes() {
    return this.#simulations.get(this.#zoom)?.discoursemes ?? []
  }

  updateItemPosition(itemId: string, originX: number, originY: number) {
    this.#simulations.forEach((simulation) => {
      simulation.updateItemPosition(itemId, originX, originY)
    })
    this.#runAppropriateSimulation()
  }

  onSimulationUpdate(callback: () => void) {
    this.#simulationUpdateCallbacks.push(callback)
    return () => {
      this.#simulationUpdateCallbacks = this.#simulationUpdateCallbacks.filter(
        (cb) => cb !== callback,
      )
    }
  }

  #publishPositions() {
    this.#simulationUpdateCallbacks.forEach((callback) => callback())
  }
}
