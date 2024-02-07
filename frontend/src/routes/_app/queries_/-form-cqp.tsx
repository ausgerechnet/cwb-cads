import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'

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
import { CorpusSelect } from '@/components/corpus-select'
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
import { DiscoursemeSelect } from '@/components/discourseme-select'

const InputCQP = z.object({
  corpus_id: z.number({ required_error }).int(),
  discourseme_id: z.number().int().optional(),
  cqp_query: z.string({ required_error }),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  context_break: z.enum(['p', 's'], {
    required_error,
  }),
})

export function FormCQP() {
  const { corpora, discoursemes } = useLoaderData({
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
    defaultValues: {
      match_strategy: 'longest',
    },
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
            name="discourseme_id"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Discourseme</FormLabel>
                <FormControl>
                  <DiscoursemeSelect
                    className="w-full"
                    discoursemes={discoursemes}
                    discoursemeId={field.value}
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
