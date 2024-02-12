import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useLoaderData, useNavigate } from '@tanstack/react-router'

import { required_error } from '@/lib/strings'
import { postQueryMutationOptions } from '@/lib/queries'
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
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { Large } from '@/components/ui/typography'
import { useFormFieldDependency } from '@/lib/use-form-field-dependency'
import { QuickCreateDiscourseme } from '@/components/quick-create-discourseme'

const InputCQP = z.object({
  corpus_id: z.number({ required_error }).int(),
  discourseme_id: z.number().int().optional(),
  cqp_query: z.string({ required_error }),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  s: z.string({ required_error }),
})

export function FormCQP() {
  const { corpora, discoursemes } = useLoaderData({
    from: '/_app/queries/new',
    strict: true,
  })
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof InputCQP>>({
    resolver: zodResolver(InputCQP),
    defaultValues: {
      match_strategy: 'longest',
    },
  })

  const corpusId = form.watch('corpus_id')
  const selectedCorpus = corpora.find(({ id }) => id === corpusId)

  const fieldValueS = useFormFieldDependency(form, 's', selectedCorpus?.s_atts)

  const {
    mutate: postQuery,
    isPending,
    isSuccess,
    error,
  } = useMutation({
    ...postQueryMutationOptions,
    onSuccess: (data, variables, context) => {
      postQueryMutationOptions.onSuccess?.(data, variables, context)
      navigate({
        to: '/queries/$queryId',
        params: { queryId: String(data.id) },
      })
    },
  })

  const isDisabled = isPending || isSuccess
  function onSubmit(data: z.infer<typeof InputCQP>) {
    if (isDisabled) return
    postQuery(data)
  }

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
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Large className="col-span-full">ToDo: Subcorpus selection</Large>
            <FormField
              control={form.control}
              name="discourseme_id"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Discourseme</FormLabel>
                  <div className="col-span-full flex gap-4">
                    <FormControl>
                      <DiscoursemeSelect
                        className="w-full"
                        discoursemes={discoursemes}
                        discoursemeId={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <QuickCreateDiscourseme />
                  </div>
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
          </fieldset>
        </form>
      </Form>
    </div>
  )
}