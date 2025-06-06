import { Cloud, Discourseme, Word } from './word-cloud-compute'

export interface WordInput {
  id: string
  x: number
  y: number
  originX?: number
  originY?: number
  label: string
  score: number
}

export interface DiscoursemeInput extends WordInput {
  discoursemeId: number
}

export interface WordDisplay extends Required<WordInput> {
  isBackground?: boolean
  hasNearbyElements: boolean
  isColliding: boolean
  displayHeight: number
  displayWidth: number
  index: number
}

export interface DiscoursemeDisplay extends Required<DiscoursemeInput> {
  hasNearbyElements: boolean
  isColliding: boolean
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
        cutOff: number
        words: WordInput[]
        discoursemes: DiscoursemeInput[]
      }
    }
  | {
      type: 'update_size'
      payload: {
        displayHeight: number
        displayWidth: number
      }
    }
  | {
      type: 'zoom'
      payload: {
        zoom: number
      }
    }

export type CloudWorkerResponse =
  | {
      type: 'update_positions'
      words: WordDisplay[]
      discoursemes: DiscoursemeDisplay[]
    }
  | { type: 'ready' }

function postMessage(data: CloudWorkerResponse) {
  self.postMessage(data)
}

let cloud: Cloud | null = null

self.onmessage = function ({ data }: MessageEvent<CloudWorkerMessage>) {
  switch (data.type) {
    case 'update': {
      const { cutOff, width, height, words, discoursemes } = data.payload
      const zoom = cloud?.zoom ?? 1
      cloud?.destroy()
      cloud = new Cloud(
        width,
        height,
        words.map(
          (word) =>
            new Word(word.x, word.y, word.label, word.id, {
              score: word.score,
              originX: word.originX,
              originY: word.originY,
            }),
        ),
        discoursemes.map(
          (discourseme) =>
            new Discourseme(
              discourseme.x,
              discourseme.y,
              discourseme.label,
              discourseme.id,
              discourseme.discoursemeId,
              {
                score: discourseme.score,
                originX: discourseme.originX,
                originY: discourseme.originY,
              },
            ),
        ),
        { backgroundCutOff: cutOff, zoom },
      )
      cloud.onSimulationUpdate(publishPositions)
      cloud.setDisplaySize(
        data.payload.displayWidth,
        data.payload.displayHeight,
      )
      break
    }
    case 'update_size': {
      if (cloud) {
        cloud.setDisplaySize(
          data.payload.displayWidth,
          data.payload.displayHeight,
        )
      }
      break
    }
    case 'zoom': {
      if (cloud) {
        cloud.zoom = data.payload.zoom
      }
      break
    }
  }
}

function publishPositions() {
  if (!cloud) return
  const displayWords = cloud.words.map(
    (word): WordDisplay => ({
      id: word.id,
      x: word.x,
      y: word.y,
      label: word.label,
      originX: word.originX ?? word.x,
      originY: word.originY ?? word.y,
      score: word.score ?? 1,
      isBackground: word.isBackground ?? false,
      hasNearbyElements: word.hasNearbyElements,
      isColliding: word.isColliding,
      displayHeight: word.displayHeight,
      displayWidth: word.displayWidth,
      index: word.index ?? 0,
    }),
  )
  const displayDiscoursemes = cloud.discoursemes.map(
    (discourseme): DiscoursemeDisplay => ({
      x: discourseme.x,
      y: discourseme.y,
      label: discourseme.label,
      originX: discourseme.originX ?? discourseme.x,
      originY: discourseme.originY ?? discourseme.y,
      score: discourseme.score ?? 1,
      discoursemeId: discourseme.discoursemeId,
      id: discourseme.id,
      hasNearbyElements: discourseme.hasNearbyElements,
      isColliding: discourseme.isColliding,
      displayHeight: discourseme.displayHeight,
      displayWidth: discourseme.displayWidth,
      index: discourseme.index ?? 0,
    }),
  )
  postMessage({
    type: 'update_positions',
    words: displayWords,
    discoursemes: displayDiscoursemes,
  })
}

postMessage({ type: 'ready' })
