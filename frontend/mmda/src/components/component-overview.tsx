import { useState } from 'react'
import { Headline1, Headline2 } from '@cads/shared/components/ui/typography'
import { Ellipsis } from '@cads/shared/components/ellipsis'
import { InputGrowable } from '@cads/shared/components/input-growable'
import { AssociationMatrix } from '@cads/shared/components/association-matrix'
import { SelectMulti } from '@cads/shared/components/select-multi'
import { LabelBox } from '@cads/shared/components/label-box'
import { Input } from '@cads/shared/components/ui/input'

import { TokenLine } from '../routes/_app/constellations_/$constellationId/-constellation-concordance-lines'
import WordCloud from './word-cloud'
import { WordCloudPreview } from './word-cloud-preview'
import { ReactNode } from '@tanstack/react-router'

export function ComponentOverview() {
  const [multiSelectValue, setMultiSelectValue] = useState<number[]>([])
  return (
    <div className="p-2">
      <Headline1 className="my-4">Component Overview goes here</Headline1>

      <Headline2 className="my-4">SelectMulti</Headline2>
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

      <Headline2 className="my-4">Ellipsis</Headline2>
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

      <Headline2 className="my-4">Token Line</Headline2>
      <code className="bg-muted text-muted-foreground my-1 inline-block rounded px-1 py-0.5">
        &lt;TokenLine ... /&gt;
      </code>

      <div className="flex">
        <TokenLine
          tokens={[
            {
              cpos: 5077121,
              is_filter_item: false,
              offset: -25,
              out_of_window: true,
              primary: 'aufmachen',
              secondary: 'aufmachen',
            },
            {
              cpos: 5077122,
              is_filter_item: false,
              offset: -24,
              out_of_window: true,
              primary: ',',
              secondary: ',',
            },
            {
              cpos: 5077123,
              is_filter_item: false,
              offset: -23,
              out_of_window: true,
              primary: 'anstatt',
              secondary: 'anstatt',
            },
            {
              cpos: 5077124,
              is_filter_item: false,
              offset: -22,
              out_of_window: true,
              primary: 'nur',
              secondary: 'nur',
            },
            {
              cpos: 5077125,
              is_filter_item: false,
              offset: -21,
              out_of_window: true,
              primary: 'Konfrontation',
              secondary: 'Konfrontation',
            },
            {
              cpos: 5077126,
              is_filter_item: false,
              offset: -20,
              out_of_window: true,
              primary: 'zu',
              secondary: 'zu',
            },
            {
              cpos: 5077127,
              is_filter_item: false,
              offset: -19,
              out_of_window: true,
              primary: 'suchen',
              secondary: 'suchen',
            },
            {
              cpos: 5077128,
              is_filter_item: false,
              offset: -18,
              out_of_window: true,
              primary: ',',
              secondary: ',',
            },
            {
              cpos: 5077129,
              is_filter_item: false,
              offset: -17,
              out_of_window: true,
              primary: 'Kolleginnen',
              secondary: 'Kollegin',
            },
            {
              cpos: 5077130,
              is_filter_item: false,
              offset: -16,
              out_of_window: true,
              primary: 'und',
              secondary: 'und',
            },
            {
              cpos: 5077131,
              is_filter_item: false,
              offset: -15,
              out_of_window: true,
              primary: 'Kollegen',
              secondary: 'Kollege',
            },
            {
              cpos: 5077132,
              is_filter_item: false,
              offset: -14,
              out_of_window: true,
              primary: '.',
              secondary: '.',
            },
            {
              cpos: 5077133,
              is_filter_item: false,
              offset: -13,
              out_of_window: true,
              primary: '(',
              secondary: '(',
            },
            {
              cpos: 5077134,
              is_filter_item: false,
              offset: -12,
              out_of_window: true,
              primary: 'Beifall',
              secondary: 'Beifall',
            },
            {
              cpos: 5077135,
              is_filter_item: false,
              offset: -11,
              out_of_window: true,
              primary: 'bei',
              secondary: 'bei',
            },
            {
              cpos: 5077136,
              is_filter_item: false,
              offset: -10,
              out_of_window: true,
              primary: 'Abgeordneten',
              secondary: 'Abgeordnete',
            },
            {
              cpos: 5077137,
              is_filter_item: false,
              offset: -9,
              out_of_window: true,
              primary: 'der',
              secondary: 'die',
            },
            {
              cpos: 5077138,
              is_filter_item: false,
              offset: -8,
              out_of_window: true,
              primary: 'SPD',
              secondary: 'SPD',
            },
            {
              cpos: 5077139,
              is_filter_item: false,
              offset: -7,
              out_of_window: true,
              primary: ')',
              secondary: ')',
            },
            {
              cpos: 5077140,
              is_filter_item: false,
              offset: -6,
              out_of_window: true,
              primary: 'Viertens',
              secondary: 'viertens',
            },
            {
              cpos: 5077141,
              is_filter_item: false,
              offset: -5,
              out_of_window: true,
              primary: '.',
              secondary: '.',
            },
            {
              cpos: 5077142,
              is_filter_item: false,
              offset: -4,
              out_of_window: false,
              primary: 'Wir',
              secondary: 'sie',
            },
            {
              cpos: 5077143,
              is_filter_item: false,
              offset: -3,
              out_of_window: false,
              primary: 'müssen',
              secondary: 'müssen',
            },
            {
              cpos: 5077144,
              is_filter_item: false,
              offset: -2,
              out_of_window: false,
              primary: 'neue',
              secondary: 'neu',
            },
            {
              cpos: 5077145,
              is_filter_item: false,
              offset: -1,
              out_of_window: false,
              primary: 'vertrauensbildende',
              secondary: 'vertrauensbildend',
            },
          ]}
          discoursemeRanges={[
            {
              discourseme_id: 3,
              start: 5077130,
              end: 5077131,
            },
            {
              discourseme_id: 0,
              start: 5077138,
              end: 5077140,
            },
            {
              discourseme_id: 1,
              start: 5077140,
              end: 5077144,
            },
            {
              discourseme_id: 2,
              start: 5077143,
              end: 5077149,
            },
          ]}
          secondary="meme"
        />
      </div>

      <Headline2 className="my-4">Word Cloud Preview</Headline2>
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

      <Headline2 className="my-4">Word Cloud</Headline2>
      <div className="relative grid aspect-video max-w-[1200px] grid-cols-[5rem_1fr_5rem] grid-rows-[5rem_1fr_5rem] overflow-hidden outline outline-1 outline-yellow-300">
        <WordCloud
          words={[
            {
              x: 0,
              y: 0,
              item: 'Hello',
              source: 'items',
              originX: 0,
              originY: 0,
              significance: 0.5,
            },
            {
              x: -900,
              y: -900,
              item: 'World',
              source: 'items',
              originX: -900,
              originY: -900,
              significance: 0.2,
            },
            {
              x: 900,
              y: 900,
              item: '!',
              source: 'items',
              originX: 900,
              originY: 900,
              significance: 0.1,
            },
          ]}
          semanticMapId={0}
          className="col-start-2 row-start-2 h-full w-full"
        />
      </div>

      <Headline2 className="my-4">Automatically Growing Input</Headline2>
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

      <Headline2 className="my-4">AssociationMatrix</Headline2>
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

      <Headline2 className="my-4">LabelBox</Headline2>
      <Code>&lt;LabelBox ... /&gt;</Code>

      <div className="flex gap-3">
        <LabelBox labelText="Label Text">
          <Input defaultValue="Lorem ipsum dolor sit amet" />
        </LabelBox>
        <LabelBox labelText="Label Text">
          <Input defaultValue="Lorem ipsum dolor sit amet" />
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
