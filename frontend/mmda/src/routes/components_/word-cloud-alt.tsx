import { ComponentProps, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ExpandIcon } from 'lucide-react'

import {
  WordCloudAlt,
  WordCloudEvent,
} from '@/components/word-cloud-alt/word-cloud-alt'
import { Checkbox } from '@cads/shared/components/ui/checkbox'
import { buttonVariants } from '@cads/shared/components/ui/button'
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
      <div className="my-2 grid w-max grid-cols-[auto_auto] gap-8">
        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={debug}
              onCheckedChange={() => setDebug(!debug)}
            />
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
        </div>

        <Link
          to="/components/word-cloud-alt/full"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          <ExpandIcon className="mr-2 h-4 w-4" />
          Fullscreen Demo
        </Link>
      </div>

      <BlockComment>
        This simulates an extreme example with a dense cluster of items in the
        center.
      </BlockComment>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt
          hideOverflow
          className="aspect-[2/1]"
          words={addMoreWords ? [...wordsCluster, ...moreWords] : wordsCluster}
          debug={debug}
          discoursemes={addDiscoursemes ? discoursemes : []}
          onChange={(event) => setEventsA((prev) => [event, ...prev])}
          padding={[200, 100]}
        />
      </div>
      <WordCloudEvents events={eventsA} />

      <BlockComment>
        This is a more reasonable example with a smaller cluster of items.
      </BlockComment>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt
          hideOverflow
          className="aspect-[2/1]"
          words={[...wordsSmallCluster, ...(addMoreWords ? moreWords : [])]}
          debug={debug}
          discoursemes={addDiscoursemes ? discoursemes : []}
          onChange={(event) => setEventsB((prev) => [event, ...prev])}
          padding={[200, 100]}
        />
      </div>
      <WordCloudEvents events={eventsB} />

      <BlockComment>
        Minimal example with two overlapping items, one hneighboring item and
        one that's far from its origin.
      </BlockComment>

      <div className="my-3 outline outline-1 outline-pink-400">
        <WordCloudAlt
          hideOverflow
          className="aspect-[2/1]"
          words={[...wordsCollision, ...(addMoreWords ? moreWords : [])]}
          debug={debug}
          discoursemes={addDiscoursemes ? discoursemes : []}
          onChange={(event) => setEventsC((prev) => [event, ...prev])}
          padding={[200, 100]}
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

const wordsCollision = [
  { x: 0.1, y: 0, label: 'Neighbor', score: 1 },
  { x: 0, y: 0, label: 'Overlap A', score: 1 },
  { x: 0, y: 0.55, label: 'Overlap B', score: 1 },
  { x: -1, y: -1, label: 'TOP LEFT!!', score: 1 },
  { x: 1, y: 1, label: 'BOTTOM RIGHT!!', score: 1 },
] satisfies ComponentProps<typeof WordCloudAlt>['words']

const wordsCluster = [
  { x: 0, y: 0, label: 'Greetings', score: 1 },
  { x: 0, y: 0.01, label: 'Godmorgon', score: 0.8 },
  { x: -1, y: -1, label: 'TOP LEFT!!', score: 0.5 },
  { x: 0.5, y: 0, label: 'World', score: 0.6 },
  { x: 0, y: 0.1, label: 'Hi', score: 0.3 },
  { x: -0.5, y: 0.9, label: 'Whoop', score: 0.4 },
  ...Array.from({ length: 200 }, (_, i) => ({
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

const moreWords = Array.from({ length: 100 }, (_, i) => ({
  x: 2 * rnd(i + 1_000) - 1,
  y: 2 * rnd(i + 1_000 + 1) - 1,
  label: `Additional Word ${i}`,
  score: rnd((i + 1_000) ** 2 + 64) ** 4,
  isBackground: rnd((i + 1_000) * 2) < 0.8,
}))

const wordsSmallCluster = wordsCluster.filter((_, i) => rnd(i) < 0.3)

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
