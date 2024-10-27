import { useForm } from 'react-hook-form'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { discoursemesList, createConstellation } from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Button } from '@cads/shared/components/ui/button'
import { Input } from '@cads/shared/components/ui/input'
import { Card } from '@cads/shared/components/ui/card'
import { DiscoursemeListSelect } from '@/components/discourseme-list-select'

export const Route = createLazyFileRoute('/_app/constellations_/new')({
  component: NewConstellation,
})

// We use a custom zod schema here because the API has too few constraints
const ConstellationFormInput = z
  .object({
    name: z.string().min(3),
    comment: z.string().optional(),
    discourseme_ids: z
      .array(z.number())
      .min(1, { message: 'Select at least one discourseme' }),
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
      comment: '',
      discourseme_ids: [],
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
  const discoursemeIds = form.watch('discourseme_ids') ?? []
  const { data: discoursemes } = useSuspenseQuery(discoursemesList)
  const selectableDiscoursemes: z.infer<typeof schemas.DiscoursemeOut>[] =
    discoursemes.filter(
      ({ id }) => id !== undefined && !discoursemeIds.includes(id),
    )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))}>
        <fieldset
          disabled={isPending}
          className="@container flex flex-col gap-4"
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
            name="comment"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comment</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid-cols-full grid gap-x-4 gap-y-4">
            <FormField
              name="discourseme_ids"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex">Discoursemes</FormLabel>
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
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Constellation
          </Button>
        </fieldset>
      </form>
      <ErrorMessage error={error} className="mt-4" />
    </Form>
  )
}
