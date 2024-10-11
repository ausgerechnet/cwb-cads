import { useMemo } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useSuspenseQueries } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { CorpusSelect } from '@/components/select-corpus'
import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@/components/ui/card'
import {
  corpusList,
  createKeywordAnalysis,
  subcorporaList,
} from '@/lib/queries'
import { schemas } from '@/rest-client'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { Large } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const emptyArray: never[] = []

export const Route = createLazyFileRoute('/_app/keyword-analysis/new')({
  component: KeywordAnalysisNew,
  pendingComponent: LoaderKeywordAnalysisNew,
})

function KeywordAnalysisNew() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useMutation({
    ...createKeywordAnalysis,
    onSuccess: (data, ...args) => {
      createKeywordAnalysis.onSuccess?.(data, ...args)
      toast.success('Keyword analysis created')
      navigate({
        to: '/keyword-analysis/$analysisId',
        params: { analysisId: String(data.id) },
      })
    },
    onError: (...args) => {
      createKeywordAnalysis.onError?.(...args)
      toast.error('Failed to create keyword analysis')
    },
  })
  const [{ data: corpora }, { data: subcorpora }] = useSuspenseQueries({
    queries: [corpusList, subcorporaList],
  })

  const form = useForm<z.infer<typeof schemas.KeywordIn>>({
    resolver: zodResolver(schemas.KeywordIn),
  })

  const corpusId = form.watch('corpus_id')
  const subcorporaForTarget = useMemo(
    () => subcorpora.filter((subcorpus) => subcorpus?.corpus?.id === corpusId),
    [corpusId, subcorpora],
  )
  const pListTarget = useMemo(
    () => corpora.find((corpus) => corpus.id === corpusId)?.p_atts ?? [],
    [corpora, corpusId],
  )

  const corpusIdReference = form.getValues('corpus_id_reference')
  const subcorporaForReference = useMemo(
    () =>
      subcorpora.filter(
        (subcorpus) => subcorpus?.corpus?.id === corpusIdReference,
      ),
    [corpusIdReference, subcorpora],
  )
  const pListReference = useMemo(
    () =>
      corpora.find((corpus) => corpus.id === corpusIdReference)?.p_atts ?? [],
    [corpora, corpusIdReference],
  )

  return (
    <AppPageFrame title="Create new Keyword Analysis">
      <Card className="max flex max-w-3xl flex-col p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))}>
            <fieldset
              className="grid max-w-3xl grid-cols-2 gap-3"
              disabled={isPending}
            >
              <Large className="col-span-2">Target</Large>
              <FormField
                control={form.control}
                name="corpus_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Corpus</FormLabel>
                    <FormControl>
                      <CorpusSelect
                        className="w-full"
                        corpora={corpora}
                        corpusId={field.value}
                        onChange={(...args) => {
                          field.onChange(...args)
                          form.setValue('subcorpus_id', undefined)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcorpus_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Subcorpus</FormLabel>
                    <FormControl>
                      <CorpusSelect
                        className="w-full"
                        corpora={subcorporaForTarget ?? emptyArray}
                        corpusId={field.value ?? undefined}
                        onChange={field.onChange}
                        disabled={corpusId === undefined}
                      />
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
                        value={field.value}
                        disabled={corpusId === undefined}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Query Layer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {pListTarget.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
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
              <Large className="col-span-2">Reference</Large>
              <FormField
                control={form.control}
                name="corpus_id_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Corpus</FormLabel>
                    <FormControl>
                      <CorpusSelect
                        className="w-full"
                        corpora={corpora}
                        corpusId={field.value}
                        onChange={(...args) => {
                          field.onChange(...args)
                          form.setValue('subcorpus_id_reference', undefined)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subcorpus_id_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Subcorpus</FormLabel>
                    <FormControl>
                      <CorpusSelect
                        className="w-full"
                        corpora={subcorporaForReference ?? emptyArray}
                        corpusId={field.value ?? undefined}
                        onChange={field.onChange}
                        disabled={corpusIdReference === undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="p_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Layer</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={corpusIdReference === undefined}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Query Layer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {pListReference.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
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
              <Button className="col-span-full" type="submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
              <ErrorMessage error={error} className="col-span-full" />
            </fieldset>
          </form>
        </Form>
      </Card>
    </AppPageFrame>
  )
}

function LoaderKeywordAnalysisNew() {
  return (
    <AppPageFrame title="Create new Keyword Analysis">
      <h1>Loading...</h1>
    </AppPageFrame>
  )
}
