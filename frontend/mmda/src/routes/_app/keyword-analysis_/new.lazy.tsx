import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
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
} from '@cads/shared/components/ui/form'
import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@cads/shared/components/ui/card'
import { corpusList, createKeywordAnalysis } from '@cads/shared/queries'
import { schemas } from '@/rest-client'
import { Button } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Large } from '@cads/shared/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'

export const Route = createLazyFileRoute('/_app/keyword-analysis_/new')({
  component: KeywordAnalysisNew,
  pendingComponent: LoaderKeywordAnalysisNew,
})

const KeywordAnalysisInput = schemas.KeywordIn.omit({
  corpus_id: true,
  corpus_id_reference: true,
  subcorpus_id_reference: true,
  subcorpus_id: true,
}).extend({
  corpus: z.object({
    corpusId: z.number(),
    subcorpusId: z.number().optional(),
  }),
  corpus_reference: z.object({
    corpusId: z.number(),
    subcorpusId: z.number().optional(),
  }),
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

  const form = useForm<z.infer<typeof KeywordAnalysisInput>>({
    resolver: zodResolver(KeywordAnalysisInput),
  })

  // It's sufficient to get the p attributes from the corpus and not query the p attributes from the subcorpus, because every subcorpus should have the same p attributes as its parent corpus.
  const { data: corpora } = useQuery(corpusList)
  const corpusId = form.watch('corpus')?.corpusId
  const pListTarget =
    corpora?.find((corpus) => corpus.id === corpusId)?.p_atts ?? []
  const corpusIdReference = form.getValues('corpus_reference')?.corpusId
  const pListReference =
    corpora?.find((corpus) => corpus.id === corpusIdReference)?.p_atts ?? []

  return (
    <AppPageFrame title="Create new Keyword Analysis">
      <Card className="max flex max-w-3xl flex-col p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              ({ corpus, corpus_reference, ...data }) =>
                mutate({
                  corpus_id: corpus.corpusId,
                  subcorpus_id: corpus.subcorpusId ?? null,
                  corpus_id_reference: corpus_reference.corpusId,
                  subcorpus_id_reference: corpus_reference.subcorpusId ?? null,
                  ...data,
                }),
            )}
          >
            <fieldset
              className="grid max-w-3xl grid-cols-2 gap-3"
              disabled={isPending}
            >
              <Large className="col-span-2">Target</Large>

              <FormField
                control={form.control}
                name="corpus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Corpus or Subcorpus</FormLabel>
                    <FormControl>
                      <SelectSubcorpus
                        className="w-full"
                        corpusId={field.value?.corpusId}
                        subcorpusId={field.value?.subcorpusId}
                        onChange={(corpusId, subcorpusId) => {
                          field.onChange({ corpusId, subcorpusId })
                          form.setValue('p', '')
                        }}
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
              <Large className="col-span-full">Reference</Large>
              <FormField
                control={form.control}
                name="corpus_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Corpus or Subcorpus</FormLabel>
                    <FormControl>
                      <SelectSubcorpus
                        className="w-full"
                        corpusId={field.value?.corpusId}
                        subcorpusId={field.value?.subcorpusId}
                        onChange={(corpusId, subcorpusId) => {
                          field.onChange({ corpusId, subcorpusId })
                        }}
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
