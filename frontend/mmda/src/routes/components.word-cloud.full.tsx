import { createFileRoute, Link } from '@tanstack/react-router'
import { ComponentProps, useCallback, useState } from 'react'
import { ShrinkIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { WordCloud } from '@/components/word-cloud'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { ButtonTooltip } from '@cads/shared/components/button-tooltip'
import { Checkbox } from '@cads/shared/components/ui/checkbox'
import { WordCloudEvent } from '@/components/word-cloud'
import { CutOffSelect } from '@/components/word-cloud/cut-off-select'

export const Route = createFileRoute('/components/word-cloud/full')({
  component: WordCloudFullscreen,
})

function WordCloudFullscreen() {
  const [debug, setDebug] = useState(false)
  const [filterItem, setFilterItem] = useState<string | null>(null)
  const [filterDiscoursemeIds, setFilterDiscoursemeIds] = useState<number[]>([])
  const [events, setEvents] = useState<WordCloudEvent[]>([])
  const [cutOff, setCutOff] = useState(0.1)
  const [componentWords, setComponentWords] =
    useState<Exclude<ComponentProps<typeof WordCloud>['words'], undefined>>(
      words,
    )

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

  function handleRandomItemMove() {
    setComponentWords((prevWords) => {
      const randdomIndex = Math.floor(Math.random() * prevWords.length)
      const newWords = [...prevWords]
      const x = Math.random() * 2 - 1
      const y = Math.random() * 2 - 1
      newWords[randdomIndex] = { ...newWords[randdomIndex], x, y }
      return newWords
    })
  }

  return (
    <div className="grid h-[calc(100svh-3.5rem)] grid-cols-[10rem_1fr_15rem_0] grid-rows-[0_auto_1fr_1rem] content-stretch gap-4 overflow-hidden">
      <div className="bg-muted z-10 col-start-1 row-span-full border-r-[1px] border-slate-600/60 shadow" />

      <div className="bg-muted z-10 col-span-2 col-start-2 row-start-2 flex gap-4 rounded-lg p-1 shadow outline outline-1 outline-slate-600/60">
        <Link
          to="/components/word-cloud"
          className={cn(
            buttonVariants({
              size: 'sm',
            }),
            'h-auto',
          )}
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
          <CutOffSelect
            value={cutOff}
            onChange={setCutOff}
            className="w-48"
            options={[
              { decile: 1, score: 0.1, scaled_score: 0.01 },
              { decile: 2, score: 0.2, scaled_score: 0.02 },
              { decile: 3, score: 0.3, scaled_score: 0.03 },
              { decile: 4, score: 0.4, scaled_score: 0.04 },
              { decile: 5, score: 0.5, scaled_score: 0.05 },
              { decile: 6, score: 0.6, scaled_score: 0.5 },
              { decile: 7, score: 0.7, scaled_score: 0.7 },
              { decile: 8, score: 0.8, scaled_score: 0.85 },
              { decile: 9, score: 0.9, scaled_score: 0.95 },
            ]}
          />
        </label>

        <ButtonTooltip
          variant="link"
          tooltip="This will randomly move a few items in the word cloud. This helps testing whether dynamic updates are handled gracefully."
          onClick={() => {
            handleRandomItemMove()
            handleRandomItemMove()
            handleRandomItemMove()
          }}
        >
          Randomly move items
        </ButtonTooltip>

        <ButtonTooltip
          variant="link"
          tooltip="Add a few random items to the word cloud. This helps testing whether dynamic updates are handled gracefully."
          onClick={() => {
            setComponentWords((prevWords) => [
              ...prevWords,
              ...Array.from({ length: 10 }, (_, i) => ({
                x: 2 * rnd(i) - 1,
                y: 2 * rnd(i + 1) - 1,
                label: `New Word ${i}`,
                score: rnd(i ** 2 + 64) ** 4,
              })),
            ])
          }}
        >
          Add random items
        </ButtonTooltip>

        <ButtonTooltip
          variant="link"
          tooltip="This will reset the word cloud to its initial state."
          onClick={() => setComponentWords(words)}
        >
          Reset Word Cloud
        </ButtonTooltip>
      </div>

      <div className="bg-muted relative z-10 col-start-3 row-start-3 h-96 w-full self-start rounded-lg shadow outline outline-1 outline-slate-600/60">
        <div className="p-1 text-sm leading-tight">
          Filter Item: {filterItem ?? 'None'}
          <br />
          Filter Discourseme Ids: {filterDiscoursemeIds.join(', ')}{' '}
          {filterDiscoursemeIds.length === 0 && 'None'}
        </div>
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
        words={componentWords}
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

const words = [
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
