import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Link, FileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import { Headline1 } from '@/components/ui/typography'
import {
  corporaQueryOptions,
  postQueryAssistedMutationOptions,
  postQueryMutationOptions,
} from '@/data/queries'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CorpusSelect } from '@/components/corpus-select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ItemsInput } from '@/components/ui/items-input'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Alert, AlertTitle } from '@/components/ui/alert'

export const Route = new FileRoute('/_app/queries/new').createRoute({
  component: QueriesNew,
  validateSearch: z.object({
    cqpMode: z.enum(['cqp', 'assisted']).optional(),
  }),
  loader: async ({ context: { queryClient } }) => {
    const corpora = await queryClient.ensureQueryData(corporaQueryOptions)
    return { corpora }
  },
})

function QueriesNew() {
  const { cqpMode = 'assisted' } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className="p-2">
      <Link to="/queries" className={navigationMenuTriggerStyle()}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Queries
      </Link>
      <Headline1 className="mb-8">New Query</Headline1>
      <Card className="max-w-xl p-4">
        <Tabs
          defaultValue={cqpMode}
          onValueChange={(value) => {
            navigate({ search: { cqpMode: value } })
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

const InputCQP = z.object({
  corpus_id: z.number({ required_error: 'Dieses Feld ist erforderlich' }).int(),
  cqp_query: z.string({ required_error: 'Dieses Feld ist erforderlich' }),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error: 'Dieses Feld ist erforderlich',
  }),
  context_break: z.enum(['p', 's'], {
    required_error: 'Dieses Feld ist erforderlich',
  }),
})

function FormCQP() {
  const { corpora } = Route.useLoaderData()
  const {
    mutate: postQuery,
    isPending,
    error,
  } = useMutation(postQueryMutationOptions)
  const form = useForm<z.infer<typeof InputCQP>>({
    resolver: zodResolver(InputCQP),
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function onSubmit({ context_break, ...data }: z.infer<typeof InputCQP>) {
    if (isPending) return
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
          <Button className="col-span-full" type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <>Submit</>
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error.message}</AlertTitle>
            </Alert>
          )}
        </form>
      </Form>
    </div>
  )
}

const InputAssisted = z.object({
  corpus_id: z.number({ required_error: 'Dieses Feld ist erforderlich' }).int(),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error: 'Dieses Feld ist erforderlich',
  }),
  items: z
    .array(z.string(), { required_error: 'Dieses Feld ist erforderlich' })
    .min(1, { message: 'Dieses Feld ist erforderlich' }),
  p: z.string({ required_error: 'Dieses Feld ist erforderlich' }),
})

function FormAssisted() {
  const { corpora } = Route.useLoaderData()
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
        {error && (
          <Alert variant="destructive" className="col-span-full">
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        )}
      </form>
    </Form>
  )
}
