import { useForm } from 'react-hook-form'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Filter, Highlighter, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import {
  discoursemesQueryOptions,
  postConstellationMutationOptions,
} from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ErrorMessage } from '@/components/error-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { Card } from '@/components/ui/card'
import { Small } from '@/components/ui/typography'

export const Route = createLazyFileRoute('/_app/constellations/new')({
  component: NewConstellation,
})

type ConstellationIn = z.infer<typeof schemas.ConstellationIn>

function NewConstellation() {
  return (
    <AppPageFrame title="Constellations">
      <Card className="max-w-2xl p-4">
        <NewConstellationForm />
      </Card>
    </AppPageFrame>
  )
}

function NewConstellationForm() {
  const navigate = useNavigate()

  const form = useForm<ConstellationIn>({
    resolver: zodResolver(schemas.ConstellationIn),
    defaultValues: {
      name: '',
      description: '',
      filter_discourseme_ids: [41, 42],
      highlight_discourseme_ids: [],
    },
  })

  const { mutate, isPending, error, isSuccess } = useMutation({
    ...postConstellationMutationOptions,
    onSuccess: (data, ...rest) => {
      postConstellationMutationOptions.onSuccess?.(data, ...rest)
      toast.success('Constellation created')
      const constellationId = data.id!.toString()
      navigate({
        to: '/constellations/$constellationId',
        params: { constellationId },
      })
    },
    onError: (...args) => {
      postConstellationMutationOptions.onError?.(...args)
      toast.error('Failed to create constellation')
    },
  })

  // Prevent selecting discoursemes that are already selected
  const filterDiscoursemeIds = form.watch('filter_discourseme_ids') ?? []
  const highlightDiscoursemeIds = form.watch('highlight_discourseme_ids') ?? []
  const { data: discoursemes } = useSuspenseQuery(discoursemesQueryOptions)
  const selectableDiscoursemes: z.infer<typeof schemas.DiscoursemeOut>[] =
    discoursemes.filter(
      ({ id }) =>
        id !== undefined &&
        !filterDiscoursemeIds.includes(id) &&
        !highlightDiscoursemeIds.includes(id),
    )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))}>
        <fieldset
          disabled={isPending}
          className="flex flex-col gap-4 @container"
        >
          <FormField
            name="name"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Constellation Name</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus={true} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="description"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus={true} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-x-4 gap-y-4 @xl:grid-cols-2">
            <FormField
              name="highlight_discourseme_ids"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex">
                    <Highlighter className="mr-2 h-4 w-4" /> Highlight
                    Discoursemes
                  </FormLabel>
                  <FormControl>
                    <DiscoursemeListSelect
                      discoursemeIds={field.value}
                      onChange={(ids) => field.onChange(ids)}
                      selectableDiscoursemes={selectableDiscoursemes}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="filter_discourseme_ids"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter Discoursemes
                  </FormLabel>
                  <FormControl>
                    <DiscoursemeListSelect
                      discoursemeIds={field.value}
                      onChange={(ids) => field.onChange(ids)}
                      selectableDiscoursemes={selectableDiscoursemes}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            className="@xl:self-end"
            type="submit"
            disabled={isPending || isSuccess}
          >
            {(isPending || isSuccess) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Constellation
          </Button>
        </fieldset>
      </form>
      <ErrorMessage error={error} className="mt-4" />
    </Form>
  )
}

function DiscoursemeListSelect({
  discoursemeIds = [],
  onChange,
  selectableDiscoursemes,
}: {
  discoursemeIds?: number[]
  selectableDiscoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  onChange: (ids: number[]) => void
}) {
  const { data: discoursemes } = useSuspenseQuery(discoursemesQueryOptions)
  const selectedDiscoursemes = discoursemes.filter(
    ({ id }) => id !== undefined && discoursemeIds.includes(id),
  )

  const handleDelete = (id: number) => {
    onChange(discoursemeIds.filter((i) => i !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedDiscoursemes.map((discourseme) => (
        <div
          key={discourseme.id}
          className="flex gap-x-4 rounded-md border border-input py-2 pl-4 pr-1 ring-ring ring-offset-2 focus-within:ring-2"
        >
          <Small className="mx-0 my-auto flex-grow">
            {discourseme.name}
            <span className="mt-1 block text-muted-foreground">
              {discourseme.description}
            </span>
          </Small>
          <Button
            onClick={() => handleDelete(discourseme.id!)}
            variant="ghost"
            type="button"
            size="icon"
            className="min-h-min min-w-min flex-shrink-0 self-center p-2 focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <DiscoursemeSelect
        className="flex-grow"
        discoursemes={selectableDiscoursemes}
        discoursemeId={undefined}
        undefinedName="Select a discourseme to add…"
        onChange={(selectedId) => {
          if (selectedId !== undefined) {
            onChange([...discoursemeIds, selectedId])
          }
        }}
      />
    </div>
  )
}
