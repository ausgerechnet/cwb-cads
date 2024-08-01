import { useForm } from 'react-hook-form'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Filter, Highlighter, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { discoursemesList, createConstellation } from '@/lib/queries'
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
import { Card } from '@/components/ui/card'
import { DiscoursemeListSelect } from '@/components/discourseme-list-select'

export const Route = createLazyFileRoute('/_app/constellations/new')({
  component: NewConstellation,
})

// We use a custom zod schema here because the API has too few constraints
const ConstellationFormInput = z
  .object({
    description: z.string().optional(),
    filter_discourseme_ids: z
      .array(z.number())
      .min(1, { message: 'Select at least one discourseme' }),
    highlight_discourseme_ids: z
      .array(z.number())
      .min(1, { message: 'Select at least one discourseme' }),
    name: z.string().min(3),
  })
  .passthrough()
type ConstellationFormInput = z.infer<typeof ConstellationFormInput>

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

  const form = useForm<ConstellationFormInput>({
    resolver: zodResolver(ConstellationFormInput),
    defaultValues: {
      name: '',
      description: '',
      filter_discourseme_ids: [],
      highlight_discourseme_ids: [],
    },
  })

  const { mutate, isPending, error, isSuccess } = useMutation({
    ...createConstellation,
    onSuccess: (data, ...rest) => {
      createConstellation.onSuccess?.(data, ...rest)
      toast.success('Constellation created')
      const constellationId = data.id!.toString()
      navigate({
        to: '/constellations/$constellationId',
        params: { constellationId },
      })
    },
    onError: (...args) => {
      createConstellation.onError?.(...args)
      toast.error('Failed to create constellation')
    },
  })

  // Prevent selecting discoursemes that are already selected
  const filterDiscoursemeIds = form.watch('filter_discourseme_ids') ?? []
  const highlightDiscoursemeIds = form.watch('highlight_discourseme_ids') ?? []
  const { data: discoursemes } = useSuspenseQuery(discoursemesList)
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
                  <Input {...field} />
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
