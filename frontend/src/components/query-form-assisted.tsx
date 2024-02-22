import { z } from 'zod'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useSuspenseQueries } from '@tanstack/react-query'

import { required_error } from '@/lib/strings'
import {
  corporaQueryOptions,
  discoursemesQueryOptions,
  postQueryAssistedMutationOptions,
} from '@/lib/queries'
import { useFormFieldDependency } from '@/lib/use-form-field-dependency'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ItemsInput } from '@/components/ui/items-input'
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
import { CorpusSelect } from '@/components/select-corpus'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { Checkbox } from '@/components/ui/checkbox'
import { Large } from '@/components/ui/typography'
import { QuickCreateDiscourseme } from '@/components/quick-create-discourseme'

const InputAssisted = z.object({
  corpus_id: z.number({ required_error }).int(),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  discourseme_id: z.number().int().nonnegative().optional(),
  items: z
    .array(z.string(), { required_error })
    .min(1, { message: required_error }),
  escape: z.boolean().optional().default(false),
  ignore_case: z.boolean().optional().default(false),
  ignore_diacritics: z.boolean().optional().default(false),
  p: z.string({ required_error }),
  s: z.string({ required_error }),
})

export function QueryFormAssisted({
  onSuccess,
}: {
  onSuccess?: (queryId: number) => void
}) {
  const [{ data: corpora }, { data: discoursemes }] = useSuspenseQueries({
    queries: [corporaQueryOptions, discoursemesQueryOptions],
  })

  const form = useForm<z.infer<typeof InputAssisted>>({
    resolver: zodResolver(InputAssisted),
    defaultValues: { match_strategy: 'longest' },
  })

  const corpusId = form.watch('corpus_id')
  const selectedCorpus = corpora.find(({ id }) => id === corpusId)

  useFormFieldDependency(form, 's', selectedCorpus?.s_atts)
  useFormFieldDependency(form, 'p', selectedCorpus?.p_atts)

  const {
    mutate: postQueryAssisted,
    isSuccess,
    isPending,
    error,
  } = useMutation({
    ...postQueryAssistedMutationOptions,
    onSuccess: (data, variables, context) => {
      postQueryAssistedMutationOptions.onSuccess?.(data, variables, context)
      const queryId = data.id
      toast.success('Query created')
      typeof queryId === 'number' && onSuccess?.(queryId)
    },
    onError: (...args) => {
      postQueryAssistedMutationOptions.onError?.(...args)
      toast.error('Failed to create query')
    },
  })

  const isDisabled = isPending || isSuccess

  function onSubmit(data: z.infer<typeof InputAssisted>): void {
    postQueryAssisted(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset
          disabled={isDisabled}
          className="grid max-w-3xl grid-cols-2 gap-3 @lg:grid-cols-2"
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
                  <QuickCreateDiscourseme onSuccess={field.onChange} />
                </div>
                <FormMessage />
              </FormItem>
            )}
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="escape"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <div className="flex items-center">
                  <FormControl>
                    <Checkbox
                      className="mr-2"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Escape special characters</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ignore_case"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <div className="flex items-center">
                  <FormControl>
                    <Checkbox
                      className="mr-2"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Ignore Case</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ignore_diacritics"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <div className="flex items-center">
                  <FormControl>
                    <Checkbox
                      className="mr-2"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Ignore Diacritics</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="match_strategy"
            render={({ field }) => (
              <FormItem className="col-span-full">
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
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem key={value}>
                <FormLabel>Query Layer</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={onChange}
                    disabled={!selectedCorpus || disabled}
                    value={value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No Query Layer Selected" />
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
          <FormField
            control={form.control}
            name="s"
            render={({ field: { onChange, value, disabled } }) => (
              <FormItem key={value}>
                <FormLabel>Context Break</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={onChange}
                    disabled={!selectedCorpus || disabled}
                    value={value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No Context Break Selected" />
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
          <Button type="submit" disabled={isDisabled} className="col-span-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
          <ErrorMessage error={error} className="col-span-full" />
        </fieldset>
      </form>
    </Form>
  )
}
