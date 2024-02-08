import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { clamp } from '@/lib/clamp'
import { postCollocationQueryMutationOptions } from '@/lib/queries'
import { required_error } from '@/lib/strings'
import { schemas } from '@/rest-client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ErrorMessage } from '@/components/error-message'
import { AppPageFrame } from '@/components/app-page-frame'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QuickCreateQuery } from '@/components/quick-create-query'
import { QuickCreateDiscourseme } from '@/components/quick-create-discourseme'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { QuerySelect } from '@/components/select-query'

export const Route = createLazyFileRoute('/_app/collocation-analysis/new')({
  component: NewCollocationAnalysis,
})

const CollocationInWithQueryId = schemas.CollocationIn.extend({
  query_id: z.number({ required_error }).min(0, required_error),
  discourseme_id: z.string({ required_error }).min(0, required_error),
  context: z.number({ required_error }).int().min(2).max(25),
  //p: z.string({ required_error }).min(0, required_error),
  s_break: z.string({ required_error }).min(0, required_error),
})

type CollocationInWithQueryId = z.infer<typeof CollocationInWithQueryId>

function NewCollocationAnalysis() {
  const { queries, discoursemes } = Route.useLoaderData()
  const { queryId } = Route.useSearch()
  const { mutate, isPending, error } = useMutation(
    postCollocationQueryMutationOptions,
  )
  const navigate = useNavigate()

  const form = useForm<CollocationInWithQueryId>({
    resolver: zodResolver(CollocationInWithQueryId),
    defaultValues: {
      query_id: queryId ?? undefined,
      context: 3,
    },
  })

  // Update the URL when the queryId selection changes
  const watchedQueryId = form.watch('query_id')
  useEffect(() => {
    navigate({
      params: {},
      search: (s) => ({ ...s, queryId: watchedQueryId }),
      replace: true,
    })
  }, [navigate, watchedQueryId])
  // Check if the queryId is even valid, otherwise remove it from the URL
  useEffect(() => {
    if (!queries.find((query) => query.id === queryId)) {
      navigate({
        params: {},
        search: (s) => ({ ...s, queryId: undefined }),
        replace: true,
      })
    }
  }, [queryId, queries, navigate])
  // selected query
  const selectedQuery = queries.find((query) => query.id === watchedQueryId)

  return (
    <AppPageFrame title="New Collocation Analysis">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            toast('Collocation analysis created', {
              description: JSON.stringify(data, null, 2),
              className: 'whitespace-pre',
            })
            mutate(data)
          })}
        >
          <fieldset disabled={isPending}>
            <FormField
              name="query_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <QuerySelect
                        queries={queries}
                        queryId={isNaN(field.value) ? undefined : field.value}
                        onChange={(newQueryId) => field.onChange(newQueryId)}
                      />
                      <QuickCreateQuery />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="discourseme_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discourseme OR CONSTELLATION?</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <DiscoursemeSelect
                        discoursemes={discoursemes}
                        discoursemeId={
                          isNaN(parseInt(field.value))
                            ? undefined
                            : parseInt(field.value)
                        }
                        onChange={(id) => {
                          field.onChange(id?.toString())
                        }}
                      />
                      <QuickCreateDiscourseme />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="context"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Window</FormLabel>
                  <div className="flex gap-4">
                    <FormControl>
                      <Slider
                        min={2}
                        max={25}
                        value={
                          field.value !== undefined ? [field.value] : undefined
                        }
                        onValueChange={(values) => {
                          field.onChange(values[0])
                        }}
                        step={1}
                      />
                    </FormControl>
                    <FormControl>
                      <Input
                        {...field}
                        onBlur={(e) => {
                          const value = clamp(parseInt(e.target.value), 2, 25)
                          if (!isNaN(value)) {
                            field.onChange(value)
                          } else {
                            field.onChange(3)
                          }
                          field.onBlur()
                        }}
                        type="number"
                        min={2}
                        max={25}
                        step={1}
                        className="w-12 text-center invalid:bg-destructive invalid:text-destructive-foreground"
                        pattern="(\d)|(1[0-5])|(0\d)"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="p"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Query Layer // corpus does not return p_atts
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!form.getValues('query_id')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Query Layer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(selectedQuery?.corpus?.p_atts ?? []).map(
                            (layer) => (
                              <SelectItem key={layer} value={layer}>
                                {layer}
                              </SelectItem>
                            ),
                          )}
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
              name="s_break"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Context Break // corpus does not return s_atts
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Context Break" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="p">Paragraph</SelectItem>
                          <SelectItem value="s">Sentence</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="whitespace-pre rounded-md bg-muted p-2 text-muted-foreground">
              Selected Query:
              {'\n'}
              {JSON.stringify(selectedQuery, null, 2)}
            </div>

            <Button className="mt-4" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="mr-2 h-4 w-4" />
              )}
              Create Collocation Analysis
            </Button>

            <ErrorMessage className="mt-4" error={error} />
          </fieldset>
        </form>
      </Form>
    </AppPageFrame>
  )
}
