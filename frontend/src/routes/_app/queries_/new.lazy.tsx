import {
  createLazyRoute,
  useLoaderData,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Card } from '@/components/ui/card'
import { Headline1 } from '@/components/ui/typography'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  postQueryAssistedMutationOptions,
  postQueryMutationOptions,
} from '@/lib/queries'
import { required_error } from '@/lib/strings'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { CorpusSelect } from '@/components/corpus-select'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { ItemsInput } from '@/components/ui/items-input'

export const Route = createLazyRoute('/_app/queries/new')({
  component: QueriesNew,
  pendingComponent: QueriesNewPending,
})

function QueriesNew() {
  const { formMode = 'assisted' } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className="p-2">
      <Headline1 className="mb-8">New Query</Headline1>
      <Card className="max-w-xl p-4">
        <Tabs
          defaultValue={formMode}
          onValueChange={(formMode) => {
            if (formMode === 'cqp' || formMode === 'assisted') {
              navigate({
                to: '/queries/new',
                search: { formMode },
                replace: true,
              })
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="cqp" className="grow">
              CQP Query
            </TabsTrigger>
            <TabsTrigger value="assisted" className="grow">
              Assisted Mode
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cqp">
            <FormCQP />
          </TabsContent>
          <TabsContent value="assisted">
            <FormAssisted />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function QueriesNewPending() {
  return (
    <div className="p-2">
      <Headline1 className="mb-8">New Query</Headline1>
      <Card className="flex max-w-xl flex-col gap-4 p-4">
        <Skeleton className="mb-4 h-12 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </Card>
    </div>
  )
}

const InputCQP = z.object({
  corpus_id: z.number({ required_error }).int(),
  cqp_query: z.string({ required_error }),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  context_break: z.enum(['p', 's'], {
    required_error,
  }),
})

function FormCQP() {
  const { corpora } = useLoaderData({
    from: '/_app/queries/new',
    strict: true,
  })
  const navigate = useNavigate()
  const router = useRouter()
  const {
    mutate: postQuery,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    ...postQueryMutationOptions,
    onSuccess: (data, variables, context) => {
      postQueryMutationOptions.onSuccess?.(data, variables, context)
      router.invalidate()
      navigate({
        to: '/queries/$queryId',
        params: { queryId: String(data.id) },
      })
    },
  })
  const form = useForm<z.infer<typeof InputCQP>>({
    resolver: zodResolver(InputCQP),
  })
  const isDisabled = isPending || isSuccess
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onSubmit({ context_break, ...data }: z.infer<typeof InputCQP>) {
    if (isDisabled) return
    postQuery(data)
  }
  return (
    <div className="@container">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid max-w-3xl grid-cols-1 gap-3 @lg:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="corpus_id"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Corpus</FormLabel>
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
            name="cqp_query"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>CQP Query</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="match_strategy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Match Strategy</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Match strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="shortest">Shortest</SelectItem>
                        <SelectItem value="longest">Longest</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
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
            name="context_break"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Context Break</FormLabel>
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
          <Button className="col-span-full" type="submit" disabled={isDisabled}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <>Submit</>
          </Button>
          <ErrorMessage className="col-span-full" error={error} />
        </form>
      </Form>
    </div>
  )
}

const InputAssisted = z.object({
  corpus_id: z.number({ required_error }).int(),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  items: z
    .array(z.string(), { required_error })
    .min(1, { message: required_error }),
  p: z.string({ required_error }),
})

function FormAssisted() {
  const { corpora } = useLoaderData({ from: '/_app/queries/new', strict: true })
  const form = useForm<z.infer<typeof InputAssisted>>({
    resolver: zodResolver(InputAssisted),
  })
  const corpusId = form.getValues('corpus_id')
  const selectedCorpus = corpora.find(({ id }) => id === corpusId)

  const {
    mutate: postQueryAssisted,
    isPending,
    error,
  } = useMutation(postQueryAssistedMutationOptions)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onSubmit(data: z.infer<typeof InputAssisted>): void {
    postQueryAssisted(data)
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid max-w-3xl grid-cols-2 gap-3 @lg:grid-cols-2"
      >
        <FormField
          control={form.control}
          name="corpus_id"
          render={({ field }) => {
            return (
              <FormItem className="col-span-full">
                <FormLabel>Corpus</FormLabel>
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
            )
          }}
        />
        <FormField
          control={form.control}
          name="items"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Items</FormLabel>
              <FormControl>
                <ItemsInput
                  defaultValue={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Komma-separierte Liste von Items, die in der Query verwendet
                werden sollen.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="match_strategy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Match Strategy</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Match strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="shortest">Shortest</SelectItem>
                      <SelectItem value="longest">Longest</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
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
          name="p"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Query Layer</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!selectedCorpus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Query Layer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(selectedCorpus?.p_atts ?? []).map((layer) => (
                        <SelectItem key={layer} value={layer}>
                          {layer}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="col-span-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit
        </Button>
        <ErrorMessage error={error} />
      </form>
    </Form>
  )
}