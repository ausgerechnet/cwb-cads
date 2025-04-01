import { useState } from 'react'
import { ReactNode } from '@tanstack/react-router'

import { Headline1, Headline2 } from '@cads/shared/components/ui/typography'
import { Ellipsis } from '@cads/shared/components/ellipsis'
import { InputGrowable } from '@cads/shared/components/input-growable'
import { AssociationMatrix } from '@cads/shared/components/association-matrix'
import { SelectMulti } from '@cads/shared/components/select-multi'
import { LabelBox } from '@cads/shared/components/label-box'
import { Input } from '@cads/shared/components/ui/input'
import { ErrorMessage } from '@cads/shared/components/error-message'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import {
  MetaFrequencyBooleanInput,
  MetaFrequencyDatetimeInput,
  MetaFrequencyNumericInput,
  MetaFrequencyUnicodeInput,
} from '@cads/shared/components/meta-frequency'
import { ToggleBar } from '@cads/shared/components/toggle-bar'

import { WordCloudPreview } from './word-cloud-preview'
import WordCloud from './word-cloud'
import { TimeSeries } from './time-series'

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}

export function ComponentOverview() {
  const [multiSelectValue, setMultiSelectValue] = useState<number[]>([])
  const [tsValue, setTsValue] = useState<string | undefined>(undefined)
  const [tsValue2, setTsValue2] = useState<string | undefined>(undefined)

  return (
    <div className="mx-auto max-w-7xl p-2 pb-16">
      <Headline1 className="mb-4 mt-16">Component Overview</Headline1>

      <Headline2 className="mb-4 mt-16">TimeSeries</Headline2>
      <Code> &lt;TimeSeries... /&gt;</Code>

      <TimeSeries
        className="my-5"
        value={tsValue}
        onChange={setTsValue}
        data={Array.from({ length: 5 }).map((_, i) => ({
          score: rnd(i),
          label: `Label ${i}`,
          median: rnd(i),
          confidence90: [rnd(i) - rnd(i) * 0.1, rnd(i) + rnd(i) * 0.1],
          confidence95: [
            rnd(i) - 0.1 - rnd(i) * 0.1,
            rnd(i) + 0.1 + rnd(i) * 0.1,
          ],
        }))}
      />

      <TimeSeries
        className="my-5"
        value={tsValue}
        onChange={setTsValue}
        data={Array.from({ length: 5 }).map((_, i) => ({
          score: rnd(i),
          label: `Label ${i}`,
          median: rnd(i),
          confidence90: [rnd(i) - rnd(i) * 0.1, rnd(i) + rnd(i) * 0.1],
          confidence95: [
            rnd(i) - 0.1 - rnd(i) * 0.1,
            rnd(i) + 0.1 + rnd(i) * 0.1,
          ],
        }))}
        zoom
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
        zoom
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
        zoom
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
        zoom
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
        zoom
      />

      <Headline2 className="mb-4 mt-16">ToggleBar</Headline2>
      <Code> &lt;ToggleBar... /&gt;</Code>

      <ToggleBar
        onChange={(value) => console.log('Selected:', value)}
        options={[['opt-1', 'Option 1'], 'Option 2', 'Option 3']}
        defaultValue="opt-1"
      />

      <Headline2 className="mb-4 mt-16">MetaFrequencyDatetimeInput</Headline2>
      <Code> &lt;MetaFrequencyDatetimeInput... /&gt;</Code>

      <MetaFrequencyDatetimeInput
        timeInterval="year"
        frequencies={Array.from({ length: 20 }).map((_, i, { length }) => ({
          value: `1990-01-${(i + 1).toString().padStart(2, '0')}T00:00:00`,
          nrTokens: (length - i) ** 2 + 5,
          nrSpans: i * 3,
        }))}
      />

      <Headline2 className="mb-4 mt-16">MetaFrequencyBooleanInput</Headline2>
      <Code> &lt;MetaFrequencyBooleanInput... /&gt;</Code>

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

      <Headline2 className="mb-4 mt-16">MetaFrequencyUnicodeInput</Headline2>
      <Code> &lt;MetaFrequencyUnicodeInput... /&gt;</Code>

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

      <Headline2 className="mb-4 mt-16">MetaFrequencyNumericInput</Headline2>
      <Code> &lt;MetaFrequencyNumericInput... /&gt;</Code>

      <MetaFrequencyNumericInput
        frequencies={Array.from({ length: 20 }).map((_, i, { length }) => ({
          value: i,
          nrTokens: (length - i) ** 2 + 5,
          nrSpans: i * 3,
        }))}
      />

      <MetaFrequencyNumericInput
        frequencies={Array.from({ length: 500 }).map((_, i, { length }) => ({
          value: i,
          nrTokens: (length - i + 500) ** 10 / 1e26 + 5_000,
          nrSpans: i * 3,
        }))}
      />

      <Headline2 className="mb-4 mt-16">ErrorMessage</Headline2>
      <Code> &lt;ErrorMessage ... /&gt;</Code>
      <div className="flex flex-col gap-1">
        <ErrorMessage error={null} />
        <ErrorMessage error={undefined} />
        <ErrorMessage error="This is a string error message" />
        <ErrorMessage error={new Error('This is an error message')} />
        <ErrorMessage
          error={[
            new Error('This is an error message within an array 1/2'),
            new Error('This is another error message within an array 2/2'),
            undefined,
            null,
            [
              new Error(
                'This is an error message within an array WITHIN an array',
              ),
              (() => {
                const e = new Error('This is an error message')
                // @ts-expect-error - simulates an error thrown by axios
                e.response = { data: { message: 'Alert!' } }
                return e
              })(),
            ],
          ]}
        />
      </div>

      <Headline2 className="mb-4 mt-16">SelectMulti</Headline2>
      <Code> &lt;SelectMulti ... /&gt;</Code>
      <SelectMulti
        items={[
          { id: 0, name: 'Aaron Aaronson' },
          { id: 1, name: 'Berta Beispiel' },
          { id: 2, name: 'Charlie Chaplin' },
          { id: 3, name: 'Dora Datensatz' },
          { id: 4, name: 'Emil Einfalt' },
          { id: 5, name: 'Frieda Falsch' },
        ]}
        itemIds={multiSelectValue}
        onChange={setMultiSelectValue}
      />

      <Headline2 className="mb-4 mt-16">Ellipsis</Headline2>
      <Code>&lt;Ellipsis&gt;...&lt;/Ellipsis&gt;</Code>

      <Ellipsis className="max-w-sm border-2 border-red-500">
        <div className="whitespace-nowrap">!</div>
        <div className="whitespace-nowrap">Child 1</div>
        <div className="whitespace-nowrap">Child 2</div>
        <div className="whitespace-nowrap">Child 3</div>
        <div className="whitespace-nowrap">Child 4</div>
        <div className="whitespace-nowrap">Child 5</div>
        <div className="whitespace-nowrap">Child 6</div>
        <div className="whitespace-nowrap">Child 7</div>
        <div className="whitespace-nowrap">Child 8</div>
      </Ellipsis>

      <Ellipsis className="max-w-sm border-2 border-red-500" direction="rtl">
        <div className="whitespace-nowrap">!</div>
        <div className="whitespace-nowrap">Child 1</div>
        <div className="whitespace-nowrap">Child 2</div>
        <div className="whitespace-nowrap">Child 3</div>
        <div className="whitespace-nowrap">Child 4</div>
        <div className="whitespace-nowrap">Child 5</div>
        <div className="whitespace-nowrap">Child 6</div>
        <div className="whitespace-nowrap">Child 7</div>
        <div className="whitespace-nowrap">Child 8</div>
      </Ellipsis>

      <Ellipsis className="max-w-lg border-2 border-red-500">
        <div className="whitespace-nowrap">Child 1</div>
        <div className="whitespace-nowrap">Child 2</div>
        <div className="whitespace-nowrap">Child 3</div>
        <div className="whitespace-nowrap">Child 4</div>
        <div className="whitespace-nowrap">Child 5</div>
        <div className="whitespace-nowrap">Child 6</div>
        <div className="whitespace-nowrap">Child 7</div>
        <div className="whitespace-nowrap">Child 8</div>
        <div className="whitespace-nowrap">!</div>
      </Ellipsis>

      <Ellipsis className="max-w-lg border-2 border-red-500" direction="rtl">
        <div className="block whitespace-nowrap">!</div>
        <div className="block whitespace-nowrap">Child 1</div>
        <div className="block whitespace-nowrap">Child 2</div>
        <div className="block whitespace-nowrap">Child 3</div>
        <div className="block whitespace-nowrap">Child 4</div>
        <div className="block whitespace-nowrap">Child 5</div>
        <div className="block whitespace-nowrap">Child 6</div>
        <div className="block whitespace-nowrap">Child 7</div>
        <div className="block whitespace-nowrap">Child 8</div>
      </Ellipsis>

      <Headline2 className="mb-4 mt-16">Word Cloud Preview</Headline2>
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

      <Headline2 className="mb-4 mt-16">Word Cloud</Headline2>
      <div className="relative grid aspect-video max-w-[1200px] grid-cols-[5rem_1fr_5rem] grid-rows-[5rem_1fr_5rem] overflow-hidden outline outline-1 outline-yellow-300">
        <WordCloud
          words={[
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
              x: 0.9,
              y: 0.9,
              item: '!',
              source: 'items',
              significance: 0.1,
            },
          ]}
          semanticMapId={0}
          className="col-start-2 row-start-2 h-full w-full"
        />
      </div>

      <Headline2 className="mb-4 mt-16">Automatically Growing Input</Headline2>
      <Code>&lt;InputGrowable ... /&gt;</Code>
      <div>
        <InputGrowable
          className="bg-background text-foreground"
          classNameLabel="outline outline-1 outline-yellow-400"
          defaultValue="Test"
        />
        <br />

        <InputGrowable
          className="bg-background text-foreground"
          classNameLabel="outline outline-1 outline-yellow-400"
          defaultValue=":-)"
        />
      </div>

      <Headline2 className="mb-4 mt-16">AssociationMatrix</Headline2>
      <Code>&lt;AssociationMatrix ... /&gt;</Code>
      <AssociationMatrix
        className="outline outline-1 outline-yellow-400"
        legendNameMap={
          new Map([
            [0, 'Anchor'],
            [1, 'Boatride'],
            [2, 'Cruise'],
          ])
        }
        associations={[
          // measure 'something'
          {
            node: 0,
            candidate: 1,
            score: 0.5,
            scaledScore: 0.5,
            measure: 'something',
          },
          {
            node: 0,
            candidate: 2,
            score: 0.3,
            scaledScore: 0.5,
            measure: 'something',
          },
          {
            node: 1,
            candidate: 2,
            score: 0.8,
            scaledScore: 0.5,
            measure: 'something',
          },

          // measure 'anything'
          {
            node: 0,
            candidate: 1,
            score: -0.5,
            scaledScore: 0.5,
            measure: 'anything',
          },
          {
            node: 0,
            candidate: 2,
            score: 0.3,
            scaledScore: 0.5,
            measure: 'anything',
          },
          {
            node: 1,
            candidate: 2,
            score: 0.8,
            scaledScore: 0.5,
            measure: 'anything',
          },

          // measure 'everything'
          {
            node: 0,
            candidate: 1,
            score: 1_000,
            scaledScore: 0.5,
            measure: 'everything',
          },
          {
            node: 0,
            candidate: 2,
            score: 250,
            scaledScore: 0.5,
            measure: 'everything',
          },
          {
            node: 1,
            candidate: 2,
            score: 0,
            scaledScore: 0.5,
            measure: 'everything',
          },
        ]}
      />

      <Headline2 className="mb-4 mt-16">LabelBox</Headline2>
      <Code>&lt;LabelBox ... /&gt;</Code>

      <div className="flex gap-3">
        <LabelBox labelText="Label Text" autoId>
          <Input defaultValue="Lorem ipsum dolor sit amet" />
        </LabelBox>
        <LabelBox labelText="Label Text" autoId>
          <Input defaultValue="Lorem ipsum dolor sit amet" />
        </LabelBox>
        <LabelBox labelText="Label Text" htmlFor="input-id">
          <Input defaultValue="Lorem ipsum dolor sit amet" id="input-id" />
        </LabelBox>
        <LabelBox labelText="A Select Input" autoId>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="adam">Aaron Aaronson</SelectItem>
                <SelectItem value="berta">Berta Beispiel</SelectItem>
                <SelectItem value="charlie">Charlie Chaplin</SelectItem>
                <SelectItem value="dora">Dora Datensatz</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </LabelBox>
      </div>
    </div>
  )
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="bg-muted text-muted-foreground mb-2 mt-1 inline-block rounded px-1 py-0.5">
      {children}
    </code>
  )
}
