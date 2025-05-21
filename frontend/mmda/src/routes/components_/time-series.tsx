import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { TimeSeries } from '@/components/time-series'
import { Block } from '../../routes/components_/-block'

export const Route = createFileRoute('/components_/time-series')({
  component: TimeSeriesComponents,
})

function TimeSeriesComponents() {
  const [tsValue, setTsValue] = useState<string | undefined>(undefined)

  return (
    <Block componentName="TimeSeries" componentTag="TimeSeries">
      <TimeSeries className="my-5" data={[]} />

      <TimeSeries
        className="my-5"
        value={tsValue}
        onChange={setTsValue}
        data={[
          {
            x_label: '2020-01',
            score: 0.5,
            score_confidence: {
              lower_95: 0.35,
              lower_90: 0.4,
              smooth: 0.55,
              upper_90: 0.6,
              upper_95: 0.65,
            },
          },
          {
            x_label: '2020-02',
            score: 0.6,
            score_confidence: {
              lower_95: 0.45,
              lower_90: 0.5,
              smooth: 0.65,
              upper_90: 0.7,
              upper_95: 0.75,
            },
          },
          {
            x_label: '2020-03',
            score: null,
            score_confidence: {
              lower_95: null,
              lower_90: null,
              smooth: null,
              upper_90: null,
              upper_95: null,
            },
          },
          {
            x_label: '2020-04',
            score: 0.5,
            score_confidence: {
              lower_95: 0.35,
              lower_90: 0.4,
              smooth: 0.55,
              upper_90: 0.6,
              upper_95: 0.65,
            },
          },
          {
            x_label: '2020-05',
            score: 0.55,
            score_confidence: {
              lower_95: 0.4,
              lower_90: 0.45,
              smooth: 0.6,
              upper_90: 0.65,
              upper_95: 0.68,
            },
          },
          {
            x_label: '2020-06',
            score: 0.5,
            score_confidence: {
              lower_95: 0.3,
              lower_90: 0.35,
              smooth: 0.45,
              upper_90: 0.75,
              upper_95: 0.85,
            },
          },
        ]}
      />
    </Block>
  )
}
