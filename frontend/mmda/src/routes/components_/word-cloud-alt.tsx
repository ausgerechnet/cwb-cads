import { ComponentProps, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { WordCloudAlt, WordCloudEvent } from '@/components/word-cloud-alt'
import { Checkbox } from '@cads/shared/components/ui/checkbox'
import { Block, BlockComment } from './-block'

export const Route = createFileRoute('/components_/word-cloud-alt')({
  component: WordCloudComponents,
})

function WordCloudComponents() {
  const [debug, setDebug] = useState(false)
  const [addMoreWords, setAddMoreWords] = useState(false)
  const [addDiscoursemes, setAddDiscoursemes] = useState(true)
  const [eventsA, setEventsA] = useState<WordCloudEvent[]>([])
  const [eventsB, setEventsB] = useState<WordCloudEvent[]>([])
  const [eventsC, setEventsC] = useState<WordCloudEvent[]>([])

  return (
    <Block componentTag="WordCloudAlt">
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox checked={debug} onCheckedChange={() => setDebug(!debug)} />
        Debug Mode
      </label>

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={addDiscoursemes}
          onCheckedChange={() => setAddDiscoursemes(!addDiscoursemes)}
        />
        Add Discoursemes
      </label>

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={addMoreWords}
          onCheckedChange={() => setAddMoreWords(!addMoreWords)}
        />
        Add more words
      </label>

      <BlockComment>
        This simulates an extreme example with a dense cluster of items in the
        center.
      </BlockComment>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt
          words={addMoreWords ? [...wordsCluster, ...moreWords] : wordsCluster}
          debug={debug}
          discoursemes={addDiscoursemes ? discoursemes : []}
          onChange={(event) => setEventsA((prev) => [...prev, { ...event }])}
        />
      </div>
      <WordCloudEvents events={eventsA} />

      <BlockComment>
        This is a more reasonable example with a smaller cluster of items.
      </BlockComment>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt
          words={[...wordsSmallCluster, ...(addMoreWords ? moreWords : [])]}
          debug={debug}
          discoursemes={addDiscoursemes ? discoursemes : []}
          onChange={(event) => setEventsB((prev) => [...prev, { ...event }])}
        />
      </div>
      <WordCloudEvents events={eventsB} />

      <BlockComment>
        Minimal example with two overlapping items, one hneighboring item and
        one that's far from its origin.
      </BlockComment>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt
          words={[...wordsCollision, ...(addMoreWords ? moreWords : [])]}
          debug={debug}
          discoursemes={addDiscoursemes ? discoursemes : []}
          onChange={(event) => setEventsC((prev) => [...prev, { ...event }])}
        />
      </div>
      <WordCloudEvents events={eventsC} />
    </Block>
  )
}

function WordCloudEvents({ events }: { events: WordCloudEvent[] }) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-semibold">
        {events.length ? 'Events:' : 'No events yet'}
      </h3>

      {Boolean(events.length) && (
        <ul className="list-disc pl-5">
          {events.map((event, index) => (
            <li key={index}>
              {event.type === 'update_discourseme_position' && (
                <span>
                  Update Discourseme: {event.discoursemeId} | X:{' '}
                  {event.x.toFixed(3)} Y: {event.y.toFixed(3)}
                </span>
              )}

              {event.type === 'update_surface_position' && (
                <span>
                  Update Surface Position: {event.surface} | X:{' '}
                  {event.x.toFixed(3)} Y: {event.y.toFixed(3)}
                </span>
              )}

              {event.type === 'add_to_discourseme' && (
                <span>
                  Add to Discourseme: {event.surface}, Discourseme ID:{' '}
                  {event.discoursemeId}
                </span>
              )}

              {event.type === 'new_discourseme' && (
                <span>
                  New Discourseme: Surfaces {event.surfaces.join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
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

const wordsCollision = [
  { x: 1_300, y: 500, label: 'Neighbor', score: 1 },
  { x: 1_000, y: 500, label: 'Overlap A', score: 1 },
  { x: 1_000, y: 530, label: 'Overlap B', score: 1 },
  { x: 1_050, y: 350, label: 'TOP LEFT!!', score: 1, originX: 0, originY: 0 },
  {
    x: 1_050,
    y: 350,
    label: 'BOTTOM RIGHT!!',
    score: 1,
    originX: 2_000,
    originY: 1_000,
  },
] satisfies ComponentProps<typeof WordCloudAlt>['words']

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
  ...Array.from({ length: 50 }, (_, i) => {
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

const wordsSmallCluster = wordsCluster.filter((_, i) => rnd(i) < 0.3)

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
