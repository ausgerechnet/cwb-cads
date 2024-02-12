import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, PlusIcon } from 'lucide-react'

import { clamp } from '@/lib/clamp'
import { useFormFieldDependency } from '@/lib/use-form-field-dependency'
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
import { QuerySelect } from '@/components/select-query'
import { Card } from '@/components/ui/card'

export const Route = createLazyFileRoute('/_app/collocation-analysis/new')({
  component: NewCollocationAnalysis,
})

const CollocationInWithQueryId = schemas.CollocationIn.extend({
  constellation_id: z.number().int().min(0, required_error).optional(),
  context: z.number({ required_error }).int().min(2).max(25),
  p: z.string({ required_error }).min(0, required_error),
  query_id: z.number({ required_error }).min(0, required_error),
  s_break: z.string({ required_error }).min(0, required_error),
})

type CollocationInWithQueryId = z.infer<typeof CollocationInWithQueryId>

function NewCollocationAnalysis() {
  const { queries } = Route.useLoaderData()
  const { queryId } = Route.useSearch()
  const navigate = useNavigate()
  const { mutate, isPending, error } = useMutation({
    ...postCollocationQueryMutationOptions,
    onSuccess: (data, ...rest) => {
      postCollocationQueryMutationOptions.onSuccess?.(data, ...rest)
      const collocationId = data.id?.toString()
      if (!collocationId) return
      navigate({
        to: '/collocation-analysis/$collocationId',
        params: { collocationId },
      })
    },
  })

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

  // selected query
  const selectedQuery = queries.find((query) => query.id === watchedQueryId)

  useFormFieldDependency(form, 'p', selectedQuery?.corpus?.p_atts ?? [])
  useFormFieldDependency(form, 's_break', selectedQuery?.corpus?.s_atts ?? [])

  function onSubmit(data: z.infer<typeof CollocationInWithQueryId>) {
    mutate(data)
  }

  return (
    <AppPageFrame title="New Collocation Analysis">
      <Card className="max-w-xl p-4 @container">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <fieldset disabled={isPending} className="flex flex-col gap-4">
              <FormField
                name="query_id"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query {field.value}</FormLabel>
                    <FormControl>
                      <div className="flex w-full gap-2">
                        <QuerySelect
                          queries={queries}
                          queryId={isNaN(field.value) ? undefined : field.value}
                          onChange={(newQueryId) => field.onChange(newQueryId)}
                          className="flex-grow"
                        />
                        <QuickCreateQuery />
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
                            field.value !== undefined
                              ? [field.value]
                              : undefined
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
              <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="p"
                  render={({ field: { onChange, value } }) => (
                    <FormItem>
                      <FormLabel>Query Layer</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={onChange}
                          value={value}
                          disabled={!form.getValues('query_id')}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No Query Layer Selected" />
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
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <FormLabel>Context Break</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={onChange}
                          value={value}
                          disabled={!form.getValues('query_id')}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="No Context Break Selected" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {(selectedQuery?.corpus?.s_atts ?? []).map(
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
      </Card>
    </AppPageFrame>
  )
}
