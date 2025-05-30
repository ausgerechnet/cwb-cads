import { Cloud, Word } from './word-cloud-compute'

export interface WordInput {
  x: number
  y: number
  originX?: number
  originY?: number
  label: string
  scale: number
  isBackground?: boolean
}

export interface WordDisplay extends Required<WordInput> {
  hasNearbyElements?: boolean
  isColliding?: boolean
  displayHeight: number
  displayWidth: number
  index: number
}

export type CloudWorkerMessage =
  | {
      type: 'update'
      payload: {
        width: number
        height: number
        displayHeight: number
        displayWidth: number
        words: WordInput[]
      }
    }
  | {
      type: 'zoom'
      payload: {
        zoom: number
      }
    }

export type CloudWorkerResponse =
  | { type: 'update_positions'; words: WordDisplay[] }
  | { type: 'ready' }

function postMessage(data: CloudWorkerResponse) {
  self.postMessage(data)
}

let cloud: Cloud | null = null

const simulateUntilStableDebounced = (() => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return () => {
    if (timeout) clearTimeout(timeout)
    if (cloud?.stableZoom.has(cloud.zoom)) {
      cloud.simulateUntilStable()
      publishPositions()
      return
    }
    timeout = setTimeout(() => {
      if (!cloud) return
      cloud.simulateUntilStable()
      publishPositions()
    }, 100)
  }
})()

self.onmessage = function ({ data }: MessageEvent<CloudWorkerMessage>) {
  switch (data.type) {
    case 'update': {
      const { width, height, words } = data.payload
      cloud?.destroy()
      cloud = new Cloud(
        width,
        height,
        words.map(
          (word) =>
            new Word(word.x, word.y, word.label, {
              scale: word.scale,
              isBackground: word.isBackground,
              originX: word.originX,
              originY: word.originY,
            }),
        ),
      )
      cloud.setDisplaySize(
        data.payload.displayWidth,
        data.payload.displayHeight,
      )

      cloud.simulateUntilStable()

      publishPositions()
      break
    }
    case 'zoom': {
      if (cloud) {
        cloud.zoom = data.payload.zoom
        simulateUntilStableDebounced()
      }
      break
    }
  }
}

function publishPositions() {
  if (!cloud) return
  const displayWords = cloud.words.map(
    (word): WordDisplay => ({
      x: word.x,
      y: word.y,
      label: word.label,
      originX: word.originX ?? word.x,
      originY: word.originY ?? word.y,
      scale: word.scale ?? 1,
      isBackground: word.isBackground ?? false,
      hasNearbyElements: word.hasNearbyElements,
      isColliding: word.isColliding,
      displayHeight: word.displayHeight,
      displayWidth: word.displayWidth,
      index: word.index ?? 0,
    }),
  )
  postMessage({ type: 'update_positions', words: displayWords })
}

postMessage({ type: 'ready' })
