import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Cloud, Word, WordCloudAlt } from '@/components/word-cloud-alt'
import { Checkbox } from '@cads/shared/components/ui/checkbox'
import { Block } from './-block'

export const Route = createFileRoute('/components_/word-cloud-alt')({
  component: WordCloudComponents,
})

function WordCloudComponents() {
  const [debug, setDebug] = useState(false)
  return (
    <Block componentTag="WordCloudAlt">
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox checked={debug} onCheckedChange={() => setDebug(!debug)} />
        Debug Mode
      </label>
      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt cloud={cloudCollision} debug={debug} />
      </div>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt cloud={cloudClump} debug={debug} />
      </div>
    </Block>
  )
}

const cloudCollision = new Cloud(
  2_000,
  1_000,
  [
    new Word(1_300, 500, 'Neighbor', { scale: 1 }),
    new Word(1_000, 500, 'Overlap A', { scale: 1 }),
    new Word(1_000, 530, 'Overlap B', { scale: 1 }),
    new Word(1_050, 350, 'TOP LEFT!!', {
      scale: 1,
      originX: 0,
      originY: 0,
    }),
  ],
  {
    enableHomeForce: false,
    repelForceFactor: 0,
  },
)

const cloudClump = new Cloud(
  2_000,
  1_000,
  [
    new Word(1_000, 500, 'Greetings'),
    new Word(1_000, 502, 'Godmorgon'),
    new Word(1_050, 420, 'TOP LEFT!!', { originX: 0, originY: 0 }),
    new Word(980, 510, 'World'),
    new Word(1_050, 480, 'Hi'),
    new Word(1_100, 500, 'Whoop'),
    new Word(1_200, 500, 'Discourseme'),
    ...Array.from(
      { length: 250 },
      (_, i) =>
        new Word(2_000 * rnd(i), 1_000 * rnd(i + 1), `Word ${i}`, {
          isBackground: rnd(i * 2) < 0.3,
          scale: rnd(i + 64) ** 2,
        }),
    ),
    // big clump!
    ...Array.from(
      { length: 80 },
      (_, i) =>
        new Word(
          900 + 200 * rnd(i),
          400 + 200 * rnd(i + 1),
          `Word ${i + 250}`,
          {
            isBackground: rnd(i * 2) < 0.8,
            scale: rnd(i + 64) ** 2,
          },
        ),
    ),
  ],
  {
    enableHomeForce: true,
  },
)

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
