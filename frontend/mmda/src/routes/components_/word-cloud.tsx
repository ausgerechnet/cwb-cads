import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import WordCloud from '../../components/word-cloud'
import { WordCloudPreview } from '../../components/word-cloud-preview'
import { Block } from './-block'

export const Route = createFileRoute('/components_/word-cloud')({
  component: WordCloudComponents,
})

function WordCloudComponents() {
  const [events, setEvents] = useState<string[]>([])

  return (
    <>
      <Block componentName="WordCloud" componentTag="WordCloud">
        <div className="relative grid aspect-video max-w-[1200px] grid-cols-[5rem_1fr_5rem] grid-rows-[5rem_1fr_5rem] overflow-hidden outline-dotted outline-1 outline-pink-500">
          <WordCloud
            onNewDiscourseme={(...event) => {
              setEvents((prev) => [...prev, `New Discourseme: ${event}`])
            }}
            onUpdateDiscourseme={(...event) => {
              setEvents((prev) => [...prev, `Update Discourseme: ${event}`])
            }}
            words={[
              {
                x: 0.1,
                y: 0.1,
                item: 'Greetings',
                source: 'discoursemes',
                discoursemeId: 42,
                significance: 1,
              },
              {
                x: 0,
                y: 0,
                item: 'Hello',
                source: 'items',
                significance: 0.5,
              },
              {
                x: -0.9,
                y: -0.9,
                item: 'World',
                source: 'items',
                significance: 0.2,
              },
              {
                x: -0,
                y: -0.1,
                item: 'Hi',
                source: 'items',
                significance: 0.19,
              },
              {
                x: -0.1,
                y: -0,
                item: 'Godmorgon',
                source: 'items',
                significance: 0.2,
              },
              {
                x: 0.9,
                y: 0.9,
                item: '!',
                source: 'items',
                significance: 0.1,
              },
              ...randomWords,
            ]}
            semanticMapId={0}
            className="col-start-2 row-start-2 h-full w-full"
          />
        </div>

        <ul className="mt-4">
          {events.map((event, index) => (
            <li key={index} className="rounded text-sm text-gray-500">
              {event}
            </li>
          ))}
        </ul>
      </Block>

      <Block componentName="WordCloudPreview" componentTag="WordCloudPreview">
        <div className="relative overflow-hidden">
          <WordCloudPreview
            items={[
              {
                x: 0.5,
                y: 0.5,
                item: 'Hello',
                source: 'keywords',
              },
              {
                x: 0.5,
                y: 0.5,
                item: 'Hello', // Should be filtered out
                source: 'keywords',
              },
              {
                x: 0.25,
                y: 0.75,
                item: 'World',
                source: 'keywords',
              },
              {
                x: 0.2,
                y: 0.2,
                item: 'Whoop',
                source: 'discoursemes',
                discourseme_id: 1,
              },
            ]}
            className="aspect-[2/1] h-96 max-w-full bg-white/5"
          />
        </div>
      </Block>
    </>
  )
}

const randomWords = Array.from({ length: 100 }, (_, i) => ({
  x: rnd(i) * 0.5 + 0.5,
  y: rnd(i + 1) * 0.5 + 0.5,
  item: `Word ${i}`,
  source: 'items',
  significance: rnd(i),
}))

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}
