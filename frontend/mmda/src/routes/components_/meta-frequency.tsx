import { createFileRoute } from '@tanstack/react-router'
import {
  MetaFrequencyBooleanInput,
  MetaFrequencyDatetimeInput,
  MetaFrequencyNumericInput,
  MetaFrequencyUnicodeInput,
} from '@cads/shared/components/meta-frequency'
import { Block, BlockComment } from './-block'
import { useState } from 'react'

export const Route = createFileRoute('/components_/meta-frequency')({
  component: MetaFrequencyComponents,
})

function MetaFrequencyComponents() {
  const [dateRange, setDateRange] = useState<[string, string]>([
    '1990-01-01T00:00:00',
    '1990-01-02T00:00:00',
  ])
  const [numRangeA, setNumRangeA] = useState<[number, number]>([0, 1])
  const [numRangeB, setNumRangeB] = useState<[number, number]>([0, 1])
  return (
    <>
      <Block componentTag="MetaFrequencyDatetimeInput">
        <MetaFrequencyDatetimeInput
          timeInterval="year"
          frequencies={Array.from({ length: 20 }).map((_, i, { length }) => ({
            value: `1990-01-${(i + 1).toString().padStart(2, '0')}T00:00:00`,
            nrTokens: (length - i) ** 2 + 5,
            nrSpans: i * 3,
          }))}
          value={dateRange}
          onChange={setDateRange}
        />
      </Block>

      <Block componentTag="MetaFrequencyNumericInput">
        <BlockComment>Just a few values…</BlockComment>

        <MetaFrequencyNumericInput
          frequencies={Array.from({ length: 20 }).map((_, i, { length }) => ({
            value: i,
            nrTokens: (length - i) ** 2 + 5,
            nrSpans: i * 3,
          }))}
          value={numRangeA}
          onChange={setNumRangeA}
        />

        <BlockComment>… a lot of values</BlockComment>

        <MetaFrequencyNumericInput
          frequencies={Array.from({ length: 500 }).map((_, i, { length }) => ({
            value: i,
            nrTokens: Math.round((length - i + 500) ** 10 / 1e26 + 5_000),
            nrSpans: i * 3,
          }))}
          value={numRangeB}
          onChange={setNumRangeB}
        />
      </Block>

      <Block componentTag="MetaFrequencyBooleanInput">
        <MetaFrequencyBooleanInput
          value={[true]}
          frequencies={[
            {
              value: true,
              nrTokens: 300,
              nrSpans: 30,
            },
            {
              value: false,
              nrTokens: 200,
              nrSpans: 20,
            },
            {
              value: null,
              nrTokens: 2,
              nrSpans: 1,
            },
          ]}
        />
      </Block>

      <Block componentTag="MetaFrequencyUnicodeInput">
        <MetaFrequencyUnicodeInput
          value={['Some category']}
          frequencies={[
            {
              value: 'Yet another category',
              nrTokens: 300,
              nrSpans: 30,
            },
            {
              value: 'Another category',
              nrTokens: 200,
              nrSpans: 20,
            },
            {
              value: 'Some category',
              nrTokens: 100,
              nrSpans: 10,
            },
            {
              value: 'Small category',
              nrTokens: 1,
              nrSpans: 10,
            },
          ]}
        />
      </Block>
    </>
  )
}
