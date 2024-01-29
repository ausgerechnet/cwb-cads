import { FileRoute } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { corporaQueryOptions, putSubcorpusMutationOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { CorpusSelect } from '@/components/corpus-select'
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

export const Route = new FileRoute('/_app/subcorpora/new').createRoute({
  component: SubcorpusNew,
  pendingComponent: SubcorpusNewPending,
  loader: async ({ context: { queryClient } }) => ({
    corpora: await queryClient.ensureQueryData(corporaQueryOptions),
  }),
})

const SubcorpusPut = z.object({
  corpusId: z.number(),
})

type SubcorpusPut = z.infer<typeof SubcorpusPut>

function SubcorpusNew() {
  const { corpora } = Route.useLoaderData()
  const form = useForm<SubcorpusPut>({
    resolver: zodResolver(SubcorpusPut),
  })
  const { mutate, isPending, error } = useMutation(putSubcorpusMutationOptions)

  return (
    <AppPageFrame title="New Subcorpus">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(({ corpusId }) =>
            mutate(String(corpusId)),
          )}
        >
          <fieldset disabled={isPending}>
            <FormField
              control={form.control}
              name="corpusId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Corpus</FormLabel>
                  <FormControl>
                    <CorpusSelect
                      corpora={corpora}
                      corpusId={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Subcorpus
            </Button>
            <ErrorMessage error={error} />
          </fieldset>
        </form>
      </Form>
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
