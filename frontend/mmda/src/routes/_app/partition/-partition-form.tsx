import { z } from 'zod'
import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { schemas } from '@/rest-client'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { corpusMeta, createSubcorpusCollection } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Input } from '@cads/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { cn } from '@cads/shared/lib/utils'
import { Button } from '@cads/shared/components/ui/button'

const Partition = schemas.SubCorpusCollectionIn.extend({
  corpus: z.object({
    corpusId: z.number(),
    subcorpusId: z.number().optional(),
  }),
  description: z.string().optional(),
  name: z.string().trim().min(2, 'Name is required'),
})

type Partition = z.infer<typeof Partition>

export function PartitionForm({ className }: { className?: string }) {
  'use no memo'
  const navigate = useNavigate()
  const form = useForm<Partition>({
    resolver: zodResolver(Partition),
    defaultValues: {
      time_interval: 'year',
      name: '',
      description: '',
    },
  })

  const corpusId = form.watch('corpus')?.corpusId
  const subcorpusId = form.watch('corpus')?.subcorpusId
  const level = form.watch('level')

  const {
    data: dataMeta,
    isLoading: isLoadingCorpus,
    error: errorMeta,
  } = useQuery({
    ...corpusMeta(corpusId),
    enabled: corpusId !== undefined,
  })

  const {
    mutate: createPartition,
    isPending,
    error,
  } = useMutation({
    ...createSubcorpusCollection,
    onSuccess: (...args) => {
      createSubcorpusCollection.onSuccess?.(...args)
      toast.success('Partition successfully created')
      const corpusId = String(args[0].corpus.id)
      navigate({
        to: '/corpora/$corpusId',
        params: { corpusId },
      })
    },
    onError: (...args) => {
      createSubcorpusCollection.onError?.(...args)
      toast.error('Failed to create partition')
    },
  })

  const levelKeyMap = useMemo(() => {
    const entries: [string, string[]][] =
      dataMeta?.levels
        .map((levelDescription): [string, string[]] => {
          const keys = levelDescription.annotations
            .filter((annotation) => annotation.value_type === 'datetime')
            .map((annotation) => annotation.key)
          return [levelDescription.level, keys]
        })
        .filter(([, keys]) => keys.length) ?? []
    return Object.fromEntries(entries)
  }, [dataMeta?.levels])

  const availableLevels = useMemo(() => Object.keys(levelKeyMap), [levelKeyMap])
  const availableKeys = useMemo(
    () => levelKeyMap[level ?? ''] ?? [],
    [levelKeyMap, level],
  )

  return (
    <Form {...form}>
      <form
        className={cn('grid grid-cols-3 gap-4', className)}
        onSubmit={form.handleSubmit(({ corpus, ...data }) =>
          createPartition({
            corpus_id: corpus.corpusId,
            subcorpus_id: corpus.subcorpusId,
            ...data,
          }),
        )}
      >
        <ErrorMessage error={[errorMeta, errorMeta]} />

        <FormField
          control={form.control}
          name="corpus"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Corpus or Subcorpus</FormLabel>

              <FormControl>
                <SelectSubcorpus
                  className="w-full"
                  corpusId={field.value?.corpusId}
                  subcorpusId={field.value?.subcorpusId}
                  onChange={(corpusId, subcorpusId) => {
                    form.reset({
                      corpus: { corpusId, subcorpusId },
                      name: '',
                      description: '',
                      level: undefined,
                      key: undefined,
                    })
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
                <Input {...field} placeholder="Name" />
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
                <Input {...field} placeholder="Description" />
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
                  key={`${corpusId}-${subcorpusId}`}
                  value={field.value}
                  onValueChange={(level) => {
                    form.resetField('key')
                    field.onChange(level)
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
                  key={level ?? 'no-level'}
                  value={field.value}
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

        <FormField
          control={form.control}
          name="time_interval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time Interval</FormLabel>

              <Select
                value={field.value}
                onValueChange={(...args) => {
                  field.onChange(...args)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Key" />
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="col-span-full" type="submit">
          {isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Create
        </Button>

        <ErrorMessage error={error} className="col-span-full" />
      </form>
    </Form>
  )
}
