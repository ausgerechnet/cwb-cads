import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { required_error } from '@/lib/strings'
import { corpusList, createQueryCQP, subcorpusOf } from '@/lib/queries'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { Textarea } from '@/components/ui/textarea'
import { CorpusSelect } from '@/components/select-corpus'
import { useFormFieldDependency } from '@/lib/use-form-field-dependency'

const InputCQP = z.object({
  corpus_id: z.number({ required_error }).int(),
  subcorpus_id: z.number().int().optional(),
  cqp_query: z.string({ required_error }),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  s: z.string({ required_error }),
})

const emptyArray: never[] = []

export function QueryFormCQP({
  onSuccess,
}: {
  onSuccess?: (queryId: number) => void
}) {
  const { data: corpora } = useSuspenseQuery(corpusList)

  const form = useForm<z.infer<typeof InputCQP>>({
    resolver: zodResolver(InputCQP),
    defaultValues: {
      match_strategy: 'longest',
    },
  })

  const corpusId = form.watch('corpus_id')
  const {
    data: subcorpora,
    isLoading: isLoadingSubcorpora,
    error: errorSubcorpora,
  } = useQuery({
    ...subcorpusOf(corpusId),
    enabled: corpusId !== undefined,
  })
  const selectedCorpus = corpora.find(({ id }) => id === corpusId)

  const fieldValueS = useFormFieldDependency(form, 's', selectedCorpus?.s_atts)

  const {
    mutate: postQuery,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    ...createQueryCQP,
    onSuccess: (data, variables, context) => {
      createQueryCQP.onSuccess?.(data, variables, context)
      const queryId = data.id
      toast.success('Query created')
      typeof queryId === 'number' && onSuccess?.(queryId)
    },
    onError: (error, variables, context) => {
      createQueryCQP.onError?.(error, variables, context)
      toast.error('Failed to create query')
    },
  })

  const isDisabled = isPending || isSuccess || isLoadingSubcorpora
  function onSubmit(data: z.infer<typeof InputCQP>) {
    if (isDisabled) return
    postQuery(data)
  }
  console.log(corpusId, subcorpora)

  return (
    <div className="@container">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset
            disabled={isDisabled}
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
                <FormItem className="col-span-full">
                  <FormLabel>Subcorpus (optional)</FormLabel>
                  <FormControl>
                    <CorpusSelect
                      className="w-full"
                      corpora={subcorpora ?? emptyArray}
                      corpusId={field.value}
                      onChange={field.onChange}
                      disabled={!subcorpora || isLoadingSubcorpora}
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
              render={({ field: { onChange, value, disabled } }) => (
                <FormItem>
                  <FormLabel>Match Strategy</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={onChange}
                      value={value}
                      disabled={disabled}
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
              key={fieldValueS}
              control={form.control}
              name="s"
              render={({ field: { onChange, disabled, value } }) => (
                <FormItem key={value}>
                  <FormLabel>Context Break</FormLabel>
                  <FormControl>
                    <Select
                      disabled={!selectedCorpus || disabled}
                      onValueChange={onChange}
                      value={value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Context Break" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(selectedCorpus?.s_atts ?? []).map((layer) => (
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
            <Button
              className="col-span-full"
              type="submit"
              disabled={isDisabled}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <>Submit</>
            </Button>
            <ErrorMessage className="col-span-full" error={error} />
            <ErrorMessage className="col-span-full" error={errorSubcorpora} />
          </fieldset>
        </form>
      </Form>
    </div>
  )
}
