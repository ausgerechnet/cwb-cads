import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  corpusList,
  corpusMetaById,
  corpusMetaFrequencies,
  createSubcorpus,
} from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { CorpusSelect } from '@/components/select-corpus'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useFormFieldDependency } from '@/lib/use-form-field-dependency'
import { schemas } from '@/rest-client'
import { Small } from '@/components/ui/typography'
import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format-number'

export const Route = createLazyFileRoute('/_app/subcorpora/new')({
  component: SubcorpusNew,
  pendingComponent: SubcorpusNewPending,
})

const SubcorpusPut = z.object({
  corpus_id: z.number(),
  description: z.string().optional(),
  create_nqr: z.boolean().default(false),
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
  const {
    data: corpusMetaData,
    isLoading: isLoadingMeta,
    error: errorMeta,
  } = useQuery({ ...corpusMetaById(corpusId), enabled: corpusId !== undefined })

  // levels
  const availableLevels =
    corpusMetaData
      ?.map(({ level }) => level)
      .filter((level): level is string => Boolean(level)) ?? []
  useFormFieldDependency(form, 'level', availableLevels)

  // keys
  const availableKeys =
    corpusMetaData
      ?.filter((meta) => meta.level === level)
      .map(({ annotations }) => annotations)
      .flat()
      .filter((annotation) => annotation?.value_type === 'unicode')
      .map((annotation) => annotation?.key)
      .filter((key): key is string => key !== undefined) ?? []
  useFormFieldDependency(form, 'key', availableKeys)

  const {
    data: dataFrequencies,
    isLoading: isLoadingFrequencies,
    error: errorFrequencies,
  } = useQuery({
    ...corpusMetaFrequencies(corpusId, level, key),
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
  })
  const isDisabled = isLoadingMeta || isLoadingFrequencies || isPending

  return (
    <AppPageFrame title="New Subcorpus">
      <ErrorMessage error={errorMeta} />
      <ErrorMessage error={errorCorpusList} />
      <ErrorMessage error={errorFrequencies} />
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
                        onChange={field.onChange}
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
                name="create_nqr"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <div className="flex items-center">
                      <FormControl>
                        <Checkbox
                          className="mr-2"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Create NQR</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {corpusMetaData && (
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <FormControl>
                        {availableLevels.length === 0 ? (
                          <div className="text-muted-foreground">
                            No levels available for this corpus
                          </div>
                        ) : (
                          <Select onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a Level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {availableLevels.map((level) => (
                                  <SelectItem value={level} key={level}>
                                    {level}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {level !== undefined && (
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key</FormLabel>
                      <FormControl>
                        {availableKeys.length === 0 ? (
                          <div className="text-muted-foreground">
                            No keys available for this level
                          </div>
                        ) : (
                          <Select onValueChange={field.onChange}>
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
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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

  console.log(metaFrequencies)
  return (
    <div className="flex flex-col gap-2">
      {selectedMetaFrequencies.map((meta) => (
        <div
          key={meta.value}
          className="flex gap-x-4 rounded-md border border-input py-2 pl-4 pr-1 ring-ring ring-offset-2 focus-within:ring-2"
        >
          <Small className="mx-0 my-auto flex-grow">
            {meta.value}
            <span className="mt-1 block text-muted-foreground">
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
