import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { TimeSeries } from '@/components/time-series'
import { Block } from '../../routes/components_/-block'

export const Route = createFileRoute('/components_/time-series')({
  component: TimeSeriesComponents,
})

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}

function TimeSeriesComponents() {
  const [tsValue, setTsValue] = useState<string | undefined>(undefined)
  const [tsValue2, setTsValue2] = useState<string | undefined>(undefined)
  return (
    <Block componentName="TimeSeries" componentTag="TimeSeries">
      <TimeSeries className="my-5" data={[]} />

      <TimeSeries
        className="my-5"
        value={tsValue}
        onChange={setTsValue}
        data={Array.from({ length: 5 }).map((_, i) => ({
          score: rnd(i) + 2,
          label: `Label ${i}`,
          median: rnd(i) + 2,
          confidence90: [rnd(i) - rnd(i) * 0.1 + 2, rnd(i) + rnd(i) * 0.1 + 2],
          confidence95: [
            rnd(i) - 0.1 - rnd(i) * 0.1 + 2,
            rnd(i) + 0.1 + rnd(i) * 0.1 + 2,
          ],
        }))}
      />

      <TimeSeries
        className="my-5"
        value={tsValue2}
        onChange={setTsValue2}
        data={[
          {
            label: '2020-01',
            score: 0.10412644381107582,
            median: 0.10412644381107582,
            confidence90: [0.09412644381107582, 0.11412644381107581],
            confidence95: [0.08412644381107581, 0.12412644381107582],
          },
          {
            label: '2021-01',
            score: 0.2576947912556128,
            median: 0.2576947912556128,
            confidence90: [0.24769479125561278, 0.2676947912556128],
            confidence95: [0.2376947912556128, 0.2776947912556128],
          },
        ]}
      />

      <TimeSeries
        className="my-5"
        value={tsValue2}
        onChange={setTsValue2}
        data={Array.from({ length: 100 }).map((_, i) => {
          const score = rnd(i) * 0.2 + 0.25
          return {
            score: rnd(i + rnd(i + 100)) < 0.5 ? undefined : score,
            label: `Label ${i}`,
            median: score,
            confidence90: [score - rnd(i) * 0.1, score + rnd(i) * 0.1] as const,
            confidence95: [
              score - 0.1 - rnd(i) * 0.05,
              score + 0.1 + rnd(i) * 0.05,
            ] as const,
          }
        })}
      />

      <TimeSeries
        className="my-5"
        data={Array.from({ length: 100 }).map((_, i) => {
          const score = rnd(i) * 0.01 + 0.25
          return {
            score: rnd(i + rnd(i + 100)) < 0.5 ? undefined : score,
            label: `Label ${i}`,
            median: score,
            confidence90: [
              score - rnd(i) * 0.02,
              score + rnd(i) * 0.01,
            ] as const,
            confidence95: [
              score - 0.01 - rnd(i) * 0.02,
              score + 0.01 + rnd(i) * 0.01,
            ] as const,
          }
        })}
      />

      <TimeSeries
        className="my-5"
        data={Array.from({ length: 100 }).map((_, i) => {
          const score = rnd(i) * 0.2 + 0.25
          return {
            score: rnd(i + rnd(i + 100)) < 0.5 ? undefined : score,
            label: `Label ${i}`,
            median: score,
            confidence90: [score - rnd(i) * 0.1, score + rnd(i) * 0.1] as const,
            confidence95: [
              score - 0.1 - rnd(i) * 0.05,
              score + 0.1 + rnd(i) * 0.05,
            ] as const,
          }
        })}
      />

      <TimeSeries
        className="my-5"
        data={Array.from({ length: 300 }).map((_, i) => ({
          score: rnd(i) < 0.1 ? undefined : rnd(i),
          label: `Label ${i}`,
          median: rnd(i),
          confidence90: [rnd(i) - rnd(i) * 0.1, rnd(i) + rnd(i) * 0.1],
          confidence95: [
            rnd(i) - 0.1 - rnd(i) * 0.1,
            rnd(i) + 0.1 + rnd(i) * 0.1,
          ],
        }))}
      />
    </Block>
  )
}
