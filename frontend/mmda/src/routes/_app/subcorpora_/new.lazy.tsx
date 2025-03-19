import { useMemo } from 'react'
import { toast } from 'sonner'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  corpusById,
  corpusList,
  corpusMetaFrequencies,
  createSubcorpus,
} from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { CorpusSelect } from '@/components/select-corpus'
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
import { schemas } from '@/rest-client'
import { Small } from '@cads/shared/components/ui/typography'
import { Card } from '@cads/shared/components/ui/card'
import { formatNumber } from '@cads/shared/lib/format-number'

export const Route = createLazyFileRoute('/_app/subcorpora_/new')({
  component: SubcorpusNew,
  pendingComponent: SubcorpusNewPending,
})

const SubcorpusPut = z.object({
  corpus_id: z.number(),
  description: z.string().optional(),
  create_nqr: z.boolean().optional().default(true),
  key: z.string(),
  level: z.string(),
  name: z.string(),
  // TODO: In the future this should also support value_bolean, value_numeric
  values_unicode: z.array(z.string()),
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

  const { data: corpus } = useQuery({
    ...corpusById(corpusId),
    enabled: corpusId !== undefined,
  })

  const levelKeyMap = useMemo(() => {
    const levelKeyPairs = (corpus?.s_annotations ?? []).map((annotation) => {
      const [level, key] = annotation.split('_')
      return { level, key }
    })
    return levelKeyPairs.reduce(
      (acc, { level, key }) => {
        if (acc[level] === undefined) {
          acc[level] = []
        }
        if (!acc[level].includes(key) && key !== undefined) {
          acc[level].push(key)
        }
        return acc
      },
      {} as Record<string, string[]>,
    )
  }, [corpus?.s_annotations])

  const availableLevels = useMemo(() => Object.keys(levelKeyMap), [levelKeyMap])
  useFormFieldDependency(form, 'level', availableLevels)
  const availableKeys = useMemo(
    () => levelKeyMap[level ?? ''] ?? [],
    [levelKeyMap, level],
  )
  useFormFieldDependency(form, 'key', availableKeys)

  const {
    data: dataFrequencies,
    isLoading: isLoadingFrequencies,
    error: errorFrequencies,
  } = useQuery({
    ...corpusMetaFrequencies(corpusId, level, key, 'unicode'),
    retry: 0,
    enabled: corpusId !== undefined && level !== undefined && key !== undefined,
  })

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
  const isDisabled = isLoadingFrequencies || isPending

  return (
    <AppPageFrame title="New Subcorpus">
      <ErrorMessage error={[errorCorpusList, errorFrequencies]} />
      <Card className="max-w-lg p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))}>
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

              {key !== undefined && (
                <FormField
                  control={form.control}
                  name="values_unicode"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Values</FormLabel>
                      {isLoadingFrequencies ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <FormControl>
                          <ValueListSelect
                            onChange={field.onChange}
                            value={field.value ?? []}
                            metaFrequencies={dataFrequencies ?? []}
                          />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button
                type="submit"
                className="col-span-full mt-4"
                disabled={isDisabled}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

function ValueListSelect({
  metaFrequencies,
  onChange,
  value,
}: {
  metaFrequencies: z.infer<typeof schemas.MetaFrequenciesOut>[]
  onChange: (values: string[]) => void
  value: string[]
}) {
  const selectedMetaFrequencies = useMemo(
    () =>
      metaFrequencies.filter((meta) => value.includes(meta.value as string)),
    [metaFrequencies, value],
  )
  const nonSelectedMetaFrequencies = metaFrequencies.filter(
    (meta) => !value.includes(meta.value as string),
  )

  return (
    <div className="flex flex-col gap-2">
      {selectedMetaFrequencies.map((meta) => (
        <div
          key={meta.value}
          className="border-input ring-ring flex gap-x-4 rounded-md border py-2 pl-4 pr-1 ring-offset-2 focus-within:ring-2"
        >
          <Small className="mx-0 my-auto flex-grow">
            {meta.value}
            <span className="text-muted-foreground mt-1 block">
              {formatNumber(meta.nr_tokens ?? 0)} Tokens
            </span>
          </Small>
          <Button
            onClick={() => onChange(value.filter((i) => i !== meta.value))}
            variant="ghost"
            type="button"
            size="icon"
            className="min-h-min min-w-min flex-shrink-0 self-center p-2 focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {nonSelectedMetaFrequencies.length > 0 && (
        <Select
          onValueChange={(newValue) => {
            onChange([...value, newValue])
          }}
          value={undefined}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a value to add" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {nonSelectedMetaFrequencies.map(
                ({ nr_tokens = 0, value = '' }) => (
                  <SelectItem value={value} key={value}>
                    {value} ({formatNumber(nr_tokens)} Tokens)
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
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
