import { createFileRoute, Link } from '@tanstack/react-router'
import { ComponentProps, useCallback, useState } from 'react'
import { ShrinkIcon } from 'lucide-react'

import { WordCloud } from '@/components/word-cloud'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { Checkbox } from '@cads/shared/components/ui/checkbox'
import { WordCloudEvent } from '@/components/word-cloud'
import { Slider } from '@cads/shared/components/ui/slider'

export const Route = createFileRoute('/components/word-cloud/full')({
  component: WordCloudFullscreen,
})

function WordCloudFullscreen() {
  const [debug, setDebug] = useState(false)
  const [filterItem, setFilterItem] = useState<string | null>(null)
  const [filterDiscoursemeIds, setFilterDiscoursemeIds] = useState<number[]>([])
  const [events, setEvents] = useState<WordCloudEvent[]>([])
  const [cutOff, setCutOff] = useState(0.1)

  const handleChange = useCallback((event: WordCloudEvent) => {
    switch (event.type) {
      case 'set_filter_item':
        setFilterItem(event.item)
        break
      case 'set_filter_discourseme_ids':
        setFilterDiscoursemeIds(event.discoursemeIds)
        break
    }
    setEvents((prev) => [event, ...prev])
  }, [])

  return (
    <div className="grid h-[calc(100svh-3.5rem)] grid-cols-[10rem_1fr_15rem_0] grid-rows-[0_auto_1fr_1rem] content-stretch gap-4 overflow-hidden">
      <div className="bg-muted z-10 col-start-1 row-span-full border-r-[1px] border-slate-600/60 shadow" />

      <div className="bg-muted z-10 col-span-2 col-start-2 row-start-2 flex gap-4 rounded-lg p-1 shadow outline outline-1 outline-slate-600/60">
        <Link
          to="/components/word-cloud"
          className={buttonVariants({
            size: 'sm',
          })}
        >
          <ShrinkIcon className="mr-2 h-4 w-4" />
          Back to Component Overview
        </Link>

        <label className="flex shrink-0 cursor-pointer items-center gap-2">
          <Checkbox checked={debug} onCheckedChange={() => setDebug(!debug)} />
          Debug Mode
        </label>

        <label className="my-auto flex items-center gap-2 whitespace-nowrap">
          Cut Off:
          <Slider
            className="w-48"
            value={[cutOff]}
            onValueChange={(value) => setCutOff(value[0])}
            min={0}
            max={1}
            step={0.01}
          />
        </label>
      </div>

      <div className="bg-muted relative z-10 col-start-3 row-start-3 h-96 w-full self-start rounded-lg shadow outline outline-1 outline-slate-600/60">
        {debug && (
          <div className="absolute h-full w-full overflow-auto p-1 [scrollbar-width:thin]">
            <strong>Events</strong>
            {events.map(({ type, ...data }, index) => (
              <div key={index} className="my-1 text-xs text-white">
                <span className="font-bold">{type}</span>
                <br />
                {Object.entries(data).map(([key, value]) => (
                  <div>
                    {key}:{' '}
                    {value === null ? (
                      <span className="text-muted-foreground italic">null</span>
                    ) : typeof value === 'number' ? (
                      Number.isInteger(value) ? (
                        value
                      ) : (
                        value.toFixed(4)
                      )
                    ) : (
                      value
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <WordCloud
        className="col-start-2 row-start-3 self-center"
        words={wordsCluster}
        discoursemes={discoursemes}
        filterItem={filterItem}
        filterDiscoursemeIds={filterDiscoursemeIds}
        debug={debug}
        cutOff={cutOff}
        onChange={handleChange}
        padding={[300, 150]}
      />
    </div>
  )
}

const discoursemes: ComponentProps<typeof WordCloud>['discoursemes'] = [
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
] satisfies ComponentProps<typeof WordCloud>['words']

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
