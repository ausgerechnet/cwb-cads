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

      <div className="bg-muted z-10 col-start-3 row-start-3 h-96 w-full self-start rounded-lg shadow outline outline-1 outline-slate-600/60" />

      <WordCloudAlt
        className="col-start-2 row-start-3 self-center"
        words={wordsCluster}
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
    x: 0,
    y: 0,
    score: 1,
  },
  {
    discoursemeId: 2,
    label: 'Irgendwas anderes',
    x: 0,
    y: 0.01,
    score: 0.8,
  },
  {
    discoursemeId: 3,
    label: 'Overlapping Discourseme',
    x: 0.1,
    y: -0.2,
    score: 0.6,
  },
]

const wordsCluster = [
  { x: 0, y: 0, label: 'Greetings', score: 1 },
  { x: 0, y: 0.01, label: 'Godmorgon', score: 0.8 },
  { x: -1, y: -1, label: 'TOP LEFT!!', score: 0.5 },
  { x: 0.5, y: 0, label: 'World', score: 0.6 },
  { x: 0, y: 0.1, label: 'Hi', score: 0.3 },
  { x: -0.5, y: 0.9, label: 'Whoop', score: 0.4 },
  ...Array.from({ length: 400 }, (_, i) => ({
    x: 2 * rnd(i) - 1,
    y: 2 * rnd(i + 1) - 1,
    label: `Word ${i}`,
    score: rnd(i ** 2 + 64) ** 4,
    isBackground: rnd(i * 2) < 0.3,
  })),
  // circular cluster around the center
  ...Array.from({ length: 100 }, (_, i) => {
    const angle = rnd(i) * Math.PI * 2
    const radius = rnd(i + 1) * 0.1
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      label: `Cluster ${i}`,
      score: rnd(i) ** 5,
      isBackground: false,
    }
  }),
] satisfies ComponentProps<typeof WordCloudAlt>['words']

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
