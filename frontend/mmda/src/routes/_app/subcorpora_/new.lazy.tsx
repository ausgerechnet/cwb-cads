import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  corpusList,
  corpusMeta,
  corpusMetaFrequencies,
  createSubcorpus,
} from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { CorpusSelect } from '@/components/select-corpus'
import {
  MetaFrequencyDatetimeInput,
  MetaFrequencyNumericInput,
  MetaFrequencyUnicodeInput,
} from '@cads/shared/components/meta-frequency'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { Button } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { Input } from '@cads/shared/components/ui/input'
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from '@cads/shared/components/ui/select'
import { useFormFieldDependency } from '@cads/shared/lib/use-form-field-dependency'
import { Card } from '@cads/shared/components/ui/card'
import { LabelBox } from '@cads/shared/components/label-box'
import { ToggleBar } from '@cads/shared/components/toggle-bar'
import { useDebouncedValue } from '@cads/shared/lib/use-debounced-value'

export const Route = createLazyFileRoute('/_app/subcorpora_/new')({
  component: SubcorpusNew,
  pendingComponent: SubcorpusNewPending,
})

const SubcorpusPut = z.object({
  corpus_id: z.number(),
  subcorpus_id: z.number().nullable().default(null),
  description: z.string().optional(),
  create_nqr: z.boolean().optional().default(true),
  key: z.string(),
  level: z.string(),
  name: z.string(),
  bins_unicode: z.array(z.string()).nullable(),
  bins_datetime: z.array(z.tuple([z.string(), z.string()])).nullable(),
  bins_numeric: z.array(z.tuple([z.number(), z.number()])).nullable(),
  bins_boolean: z.array(z.boolean()).nullable(),
})

type SubcorpusPut = z.infer<typeof SubcorpusPut>

function SubcorpusNew() {
  const navigate = useNavigate()
  const { data: corpora, error: errorCorpusList } = useSuspenseQuery(corpusList)
  const form = useForm<SubcorpusPut>({
    resolver: zodResolver(SubcorpusPut),
  })
  const corpusId = form.watch('corpus_id')
  const level = form.watch('level')
  const key = form.watch('key')

  const {
    data: dataMeta,
    isLoading: isLoadingCorpus,
    error: errorCorpus,
  } = useQuery({
    ...corpusMeta(corpusId),
    enabled: corpusId !== undefined,
  })

  const levelKeyMap = useMemo(() => {
    const entries: [string, string[]][] =
      dataMeta?.levels.map((levelDescription) => {
        const keys = levelDescription.annotations.map(
          (annotation) => annotation.key,
        )
        return [levelDescription.level, keys]
      }) ?? []
    return Object.fromEntries(entries)
  }, [dataMeta?.levels])

  const metaValueType = useMemo(() => {
    return dataMeta?.levels
      .find((levelDescription) => levelDescription.level === level)
      ?.annotations.find((annotation) => annotation.key === key)?.value_type
  }, [dataMeta?.levels, key, level])

  const availableLevels = useMemo(() => Object.keys(levelKeyMap), [levelKeyMap])

  useFormFieldDependency(form, 'level', availableLevels)

  const availableKeys = useMemo(
    () => levelKeyMap[level ?? ''] ?? [],
    [levelKeyMap, level],
  )
  useFormFieldDependency(form, 'key', availableKeys)

  const { mutate, isPending, error } = useMutation({
    ...createSubcorpus,
    onSuccess: (data, ...args) => {
      createSubcorpus.onSuccess?.(data, ...args)
      navigate({
        to: '/subcorpora/$subcorpusId',
        params: { subcorpusId: String(data?.id) },
      })
    },
    onError: (...args) => {
      createSubcorpus.onError?.(...args)
      toast.error('Failed to create subcorpus')
    },
  })

  const [sortBy, setSortBy] = useState<'bin' | 'nr_tokens' | 'nr_spans'>(
    'nr_tokens',
  )
  const [timeInterval, setTimeInterval] = useState<
    'hour' | 'day' | 'week' | 'month' | 'year'
  >('year')
  const [nrBins, setNrBins] = useState(30)
  const debouncedNrBins = useDebouncedValue(nrBins, 500)

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } =
    useInfiniteQuery({
      ...corpusMetaFrequencies(corpusId, level, key, {
        pageSize: 50,
        sortBy: metaValueType === 'datetime' ? 'bin' : sortBy,
        sortOrder: sortBy === 'bin' ? 'ascending' : 'descending',
        timeInterval: metaValueType === 'datetime' ? timeInterval : undefined,
        nrBins: debouncedNrBins,
      }),
      select: (data) => ({
        ...data,
        nrItems: data.pages[0]?.nr_items ?? 0,
        loadedItems: data.pages.reduce(
          (acc, page) => acc + page.frequencies.length,
          0,
        ),
        frequencies: data.pages
          .flatMap((page) => page.frequencies)
          .map((frequency) => ({
            value:
              frequency.bin_boolean ??
              frequency.bin_datetime ??
              frequency.bin_numeric ??
              frequency.bin_unicode,
            nrSpans: frequency.nr_spans,
            nrTokens: frequency.nr_tokens,
          })),
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

  const frequencies = useMemo(
    () => data?.frequencies ?? [],
    [data?.frequencies],
  )

  useEffect(() => {
    form.setValue('bins_datetime', null)
    form.setValue('bins_numeric', null)
    form.setValue('bins_boolean', null)
    form.setValue('bins_unicode', null)
  }, [form, key, level, sortBy])

  const isDisabled = isPending

  return (
    <AppPageFrame title="New Subcorpus">
      <ErrorMessage error={[errorCorpusList, errorCorpus]} />

      <Card className="max-w-2xl p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              // Validate that at least one bin is selected
              if (
                (data.bins_datetime === null ||
                  data.bins_datetime?.length === 0) &&
                (data.bins_numeric === null ||
                  data.bins_numeric?.length === 0) &&
                (data.bins_boolean === null ||
                  data.bins_unicode?.length === 0) &&
                (data.bins_unicode === null || data.bins_unicode?.length === 0)
              ) {
                toast.error('Please select a bin')
                if (metaValueType !== undefined) {
                  form.setError(`bins_${metaValueType}`, {
                    message: 'Required',
                  })
                }
              } else {
                mutate(data)
              }
            })}
          >
            <fieldset disabled={isPending} className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="corpus_id"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Base on corpus</FormLabel>
                    <FormControl>
                      <CorpusSelect
                        className="w-full"
                        corpora={corpora}
                        corpusId={field.value}
                        onChange={(...args) => {
                          form.resetField('level')
                          form.resetField('key')
                          field.onChange(...args)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="name" placeholder="Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="description"
                        placeholder="Description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(...args) => {
                          form.resetField('key')
                          field.onChange(...args)
                        }}
                        disabled={availableLevels.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {availableLevels.map((level) => {
                              const hasKeys = levelKeyMap[level]?.length > 0
                              return (
                                <SelectItem
                                  value={level}
                                  key={level}
                                  disabled={!hasKeys}
                                >
                                  {level}
                                  {!hasKeys && (
                                    <span className="italic"> (No keys)</span>
                                  )}
                                </SelectItem>
                              )
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>

                    <FormMessage />

                    {corpusId !== undefined &&
                      !isLoadingCorpus &&
                      availableLevels.length === 0 && (
                        <p className="text-destructive text-sm font-medium">
                          No levels available for this corpus
                        </p>
                      )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(...args) => {
                          field.onChange(...args)
                        }}
                        disabled={availableKeys.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Key" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {availableKeys.map((key) => (
                              <SelectItem value={key} key={key}>
                                {key}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    {!!level && availableKeys.length === 0 && (
                      <p className="text-destructive text-sm font-medium">
                        No keys available for this level
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {key !== undefined && metaValueType !== 'datetime' && (
                <LabelBox labelText="Sort by">
                  <ToggleBar
                    options={[
                      'bin',
                      ['nr_tokens', '#tokens'],
                      ['nr_spans', '#spans'],
                    ]}
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </LabelBox>
              )}

              {metaValueType === 'numeric' && (
                <>
                  <LabelBox labelText="Bin Number">
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={String(nrBins)}
                      onChange={(event) => {
                        setNrBins(parseInt(event.target.value))
                      }}
                    />
                  </LabelBox>

                  <FormField
                    control={form.control}
                    name="bins_numeric"
                    render={({ field }) => (
                      <FormItem className="col-span-full">
                        <FormControl>
                          <MetaFrequencyNumericInput
                            frequencies={frequencies as Frequency<number>[]}
                            onChange={(value) => field.onChange([value])}
                            value={field.value?.[0] ?? [0, 0]}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {metaValueType === 'unicode' && (
                <FormField
                  control={form.control}
                  name="bins_unicode"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormControl>
                        <MetaFrequencyUnicodeInput
                          showBars={
                            sortBy === 'nr_spans'
                              ? 'spans'
                              : sortBy === 'nr_tokens'
                                ? 'tokens'
                                : 'both'
                          }
                          value={field.value ?? []}
                          frequencies={frequencies as Frequency<string>[]}
                          onChange={(value) => {
                            field.onChange(value)
                          }}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {metaValueType === 'datetime' && (
                <ToggleBar
                  options={['hour', 'day', 'week', 'month', 'year']}
                  value={timeInterval}
                  onChange={(value) => {
                    form.resetField('bins_datetime')
                    setTimeInterval(value)
                  }}
                />
              )}

              {isLoading && (
                <div className="col-span-full flex">
                  <Loader2Icon className="mx-auto h-4 w-4 animate-spin" />
                </div>
              )}

              {metaValueType === 'datetime' && Boolean(frequencies.length) && (
                <FormField
                  key={`${timeInterval}`}
                  control={form.control}
                  name="bins_datetime"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormControl>
                        <MetaFrequencyDatetimeInput
                          frequencies={frequencies as Frequency<string>[]}
                          onChange={(value) => field.onChange([value])}
                          timeInterval={timeInterval}
                          value={
                            field.value?.[0] ??
                            ([
                              String(frequencies.at(0)?.value),
                              String(frequencies.at(-1)?.value),
                            ].toSorted() as [string, string])
                          }
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {metaValueType === 'boolean' && (
                <ErrorMessage error={new Error('Boolean not implemented')} />
              )}

              {hasNextPage && (
                <Button
                  onClick={() => fetchNextPage()}
                  className="col-span-full"
                  disabled={isFetching}
                  variant="secondary"
                  type="button"
                >
                  {isFetching && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Load more
                </Button>
              )}

              <Button
                type="submit"
                className="col-span-full mt-4"
                disabled={isDisabled}
              >
                {isPending && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Subcorpus
              </Button>

              <ErrorMessage error={error} className="col-span-full" />
            </fieldset>
          </form>
        </Form>
      </Card>
    </AppPageFrame>
  )
}

function SubcorpusNewPending() {
  return (
    <AppPageFrame title="New Subcorpus">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 max-w-52" />
        <Skeleton className="h-4 max-w-52" />
        <Skeleton className="h-4 max-w-52" />
      </div>
    </AppPageFrame>
  )
}

type Frequency<T> = {
  value: T
  nrSpans: number
  nrTokens: number
}
