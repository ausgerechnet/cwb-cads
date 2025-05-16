import { useEffect, useState } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createLazyFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

import {
  corpusById,
  corpusMeta,
  corpusMetaFrequencies,
  subcorpusCollections,
} from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@cads/shared/components/ui/card'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { parseAnnotations } from '@cads/shared/lib/parse-annotations'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { ToggleBar } from '@cads/shared/components/toggle-bar'
import { Input } from '@cads/shared/components/ui/input'
import { GraphRange, XAxisVertical } from '@cads/shared/components/graph'

export const Route = createLazyFileRoute('/_app/corpora_/$corpusId')({
  component: CorpusDetail,
})

// * hint: the `SubcorpusDetail` component is similar to the `CorpusDetail` component; maybe this can be DRYed
function CorpusDetail() {
  const corpusId = parseInt(Route.useParams().corpusId)
  const { data: corpus } = useSuspenseQuery(corpusById(corpusId))
  const { data: partitions } = useSuspenseQuery(subcorpusCollections(corpusId))
  const description = corpus?.description
  const annotations = parseAnnotations(corpus?.s_annotations ?? [])

  return (
    <AppPageFrame
      title={`Corpus: ${corpus.name}`}
      classNameContent="grid grid-cols-2 gap-4"
    >
      <Card className="grid grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <strong>Description:</strong>
        <span>
          {description ? (
            description
          ) : (
            <span className="text-muted-foreground italic">n.a.</span>
          )}
        </span>
        <strong>Language:</strong> <span>{corpus.language}</span>
        <strong>Register:</strong> <span>{corpus.register}</span>
        <strong>Layers</strong>
        <span>{(corpus.p_atts ?? []).join(', ')}</span>
        <strong>S Attributes:</strong>{' '}
        <span>{(corpus.s_atts ?? []).join(', ')}</span>
        <strong>S Annotations:</strong>
        {Object.entries(annotations).map(([key, values]) => (
          <div key={key} className="col-start-2">
            {key}: {values.join(', ')}{' '}
            {values.length === 0 && (
              <span className="text-muted-foreground italic">n.a.</span>
            )}
          </div>
        ))}
      </Card>

      <Card className="mr-auto flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold">Subcorpus Collections</h2>

        {partitions.length > 0 && (
          <ul>
            {partitions?.map((partition) => (
              <li key={partition.id}>{partition.name}</li>
            ))}
          </ul>
        )}

        {partitions.length === 0 && (
          <div className="text-muted-foreground italic">
            No subcorpus collections
          </div>
        )}

        <Link
          to="/partition"
          search={{ defaultCorpusId: corpusId }}
          className={cn('mt-auto', buttonVariants({}))}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Partition
        </Link>
      </Card>

      <MetaOverview />
    </AppPageFrame>
  )
}

function MetaOverview() {
  const corpusId = parseInt(Route.useParams().corpusId)
  const search = Route.useSearch()

  const [nr, setNr] = useState<'tokens' | 'spans'>('tokens')
  const [filterValue, setFilterValue] = useState('')
  const [timeInterval, setTimeInterval] = useState<
    'hour' | 'day' | 'week' | 'month' | 'year'
  >('week')
  const navigate = useNavigate()
  const { key, level } = search.meta ?? {}
  const { data, hasNextPage, fetchNextPage, error, isFetching } =
    useInfiniteQuery({
      ...corpusMetaFrequencies(corpusId, level as string, key as string, {
        pageSize: 100,
        timeInterval,
      }),
      select: (data) => ({
        ...data,
        valueType: data.pages[0]?.value_type,
        nrItems: data.pages[0]?.nr_items ?? 0,
        loadedItems: data.pages.reduce(
          (acc, page) => acc + page.frequencies.length,
          0,
        ),
        frequencies:
          data.pages
            .flatMap((page) => page.frequencies)
            .map((frequency) => ({
              value:
                frequency.bin_boolean ??
                frequency.bin_datetime ??
                frequency.bin_numeric ??
                frequency.bin_unicode,
              nrSpans: frequency.nr_spans,
              nrTokens: frequency.nr_tokens,
            })) ?? [],
        legalFrequencyValues:
          data.pages
            .flatMap((page) => page.frequencies)
            .map(
              (frequency) =>
                frequency.bin_boolean ??
                frequency.bin_datetime ??
                frequency.bin_numeric ??
                frequency.bin_unicode,
            ) ?? [],
      }),
      retry: 0,
      enabled: Boolean(level) && Boolean(key),
    })

  const dataPoints =
    data?.frequencies
      .filter(({ value }) => String(value).includes(filterValue))
      .map((frequency, index) => ({
        position: [
          index,
          nr === 'spans' ? frequency.nrSpans : frequency.nrTokens,
        ] satisfies [number, number],
        label: String(frequency.value ?? 'n.a.'),
      })) ?? []

  useEffect(() => {
    if (hasNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, fetchNextPage])

  return (
    <Card className="col-span-full flex flex-col gap-2 p-4">
      <h2 className="text-lg font-bold">Meta Frequencies</h2>

      <div className="flex gap-2">
        <MetaSelector
          value={search.meta}
          onChange={(value) => {
            setFilterValue('')
            navigate({
              replace: true,
              to: '.',
              params: (p) => p,
              search: (s) => ({
                ...s,
                meta: value,
              }),
            })
          }}
          corpusId={corpusId}
          className="w-max"
        />

        {data?.valueType === 'datetime' && (
          <Select
            value={timeInterval}
            onValueChange={(value) => {
              setTimeInterval(
                value as 'hour' | 'day' | 'week' | 'month' | 'year',
              )
            }}
          >
            <SelectTrigger className="w-max">
              <SelectValue placeholder="Time Interval" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {['hour', 'day', 'week', 'month', 'year'].map((interval) => (
                  <SelectItem key={interval} value={interval}>
                    {interval}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        <ToggleBar
          options={['tokens', 'spans'] as const}
          className="ml-0 mr-auto w-max"
          value={nr}
          onChange={setNr}
        />

        <Input
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          placeholder="Filter"
        />
      </div>

      <ErrorMessage error={error} />

      {dataPoints.length > 0 ? (
        <GraphRange
          className={cn('h-[28rem] pt-3', isFetching && 'animate-pulse')}
          dataPoints={dataPoints}
          pointStyle="bar"
          viewportY={[0]}
          XAxisComponent={XAxisVertical}
          hideRange={dataPoints.length < 50}
        />
      ) : (
        <div className="text-muted-foreground bg-muted flex h-24 place-content-center place-items-center rounded-lg italic">
          No data available
        </div>
      )}
    </Card>
  )
}

function MetaSelector({
  className,
  corpusId,
  value,
  onChange,
}: {
  className?: string
  corpusId: number
  value?: {
    level: string
    key: string
  }
  onChange?: (value: { level: string; key: string }) => void
}) {
  const { data: meta } = useQuery(corpusMeta(corpusId))

  const annotationPairs = meta?.levels
    .map(({ level, annotations }) =>
      annotations.map(({ key, value_type }) => ({
        level,
        key,
        valueType: value_type,
      })),
    )
    .flat()
  const currentValue = value ? `${value.level}-/-${value.key}` : undefined

  return (
    <Select
      value={currentValue}
      onValueChange={(value) => {
        const [level, key] = value.split('-/-')
        onChange?.({ level, key })
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select Annotation" />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {annotationPairs?.map(({ level, key, valueType }) => (
            <SelectItem key={`${level}-/-${key}`} value={`${level}-/-${key}`}>
              {level}: {key}{' '}
              <span className="text-muted-foreground italic">{valueType}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
