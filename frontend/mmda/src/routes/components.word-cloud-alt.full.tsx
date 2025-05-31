import { createFileRoute, Link } from '@tanstack/react-router'
import { ComponentProps, useState } from 'react'
import { ShrinkIcon } from 'lucide-react'

import { WordCloudAlt } from '@/components/word-cloud-alt'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { Checkbox } from '@cads/shared/components/ui/checkbox'

export const Route = createFileRoute('/components/word-cloud-alt/full')({
  component: WordCloudAltFullscreen,
})

function WordCloudAltFullscreen() {
  const [debug, setDebug] = useState(false)
  return (
    <div className="grid h-[calc(100svh-3.5rem)] grid-cols-[10rem_1fr_15rem_0] grid-rows-[0_auto_1fr_1rem] content-stretch gap-4 overflow-hidden">
      <div className="bg-muted z-10 col-start-1 row-span-full border-r-[1px] border-slate-600/60 shadow" />

      <div className="bg-muted z-10 col-span-2 col-start-2 row-start-2 flex gap-4 rounded-lg p-1 shadow outline outline-1 outline-slate-600/60">
        <Link
          to="/components/word-cloud-alt"
          className={buttonVariants({
            size: 'sm',
          })}
        >
          <ShrinkIcon className="mr-2 h-4 w-4" />
          Back to Component Overview
        </Link>

        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={debug} onCheckedChange={() => setDebug(!debug)} />
          Debug Mode
        </label>
      </div>

      <div className="z-10 col-start-3 row-start-3 shadow">
        <div className="bg-muted h-96 w-full rounded-lg outline outline-1 outline-slate-600/60" />
      </div>

      <WordCloudAlt
        className="col-start-2 row-start-3 self-center"
        words={[...wordsCluster, ...moreWords]}
        discoursemes={discoursemes}
        debug={debug}
        onChange={(event) => console.log('Event A:', event)}
      />
    </div>
  )
}

const discoursemes: ComponentProps<typeof WordCloudAlt>['discoursemes'] = [
  {
    discoursemeId: 1,
    label: 'Klimawandel',
    x: 1_000,
    y: 500,
    score: 1,
    originX: 1_000,
    originY: 500,
  },
  {
    discoursemeId: 2,
    label: 'Irgendwas anderes',
    x: 1_000,
    y: 600,
    score: 0.8,
    originX: 1_000,
    originY: 600,
  },
  {
    discoursemeId: 3,
    label: 'Overlapping Discourseme',
    x: 1_030,
    y: 610,
    score: 0.6,
    originX: 1_000,
    originY: 610,
  },
]

const wordsCluster = [
  { x: 1_000, y: 500, label: 'Greetings', score: 1 },
  { x: 1_000, y: 502, label: 'Godmorgon', score: 0.8 },
  { x: 1_050, y: 420, label: 'TOP LEFT!!', score: 0.5, originX: 0, originY: 0 },
  { x: 980, y: 510, label: 'World', score: 0.6 },
  { x: 1_050, y: 480, label: 'Hi', score: 0.3 },
  { x: 1_100, y: 500, label: 'Whoop', score: 0.4 },
  ...Array.from({ length: 200 }, (_, i) => ({
    x: 2_000 * rnd(i),
    y: 1_000 * rnd(i + 1),
    label: `Word ${i}`,
    score: rnd(i ** 2 + 64) ** 4,
    isBackground: rnd(i * 2) < 0.3,
  })),
  // circular cluster around the center
  ...Array.from({ length: 100 }, (_, i) => {
    const angle = rnd(i) * Math.PI * 2
    const radius = rnd(i + 1) * 200
    return {
      x: 1_000 + radius * Math.cos(angle),
      y: 500 + radius * Math.sin(angle),
      label: `Cluster ${i}`,
      score: rnd(i) ** 5,
      isBackground: false,
    }
  }),
] satisfies ComponentProps<typeof WordCloudAlt>['words']

const moreWords = Array.from({ length: 100 }, (_, i) => ({
  x: 2_000 * rnd(i),
  y: 1_000 * rnd(i + 1),
  label: `Additional Word ${i}`,
  score: rnd(i ** 2 + 64) ** 4,
  isBackground: rnd(i * 2) < 0.8,
}))

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
