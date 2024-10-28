import { z } from 'zod'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { required_error } from '@cads/shared/lib/strings'
import {
  corpusList,
  createQueryAssisted,
  subcorpusOf,
} from '@cads/shared/queries'
import { useFormFieldDependency } from '@cads/shared/lib/use-form-field-dependency'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { ItemsInput } from '@cads/shared/components/ui/items-input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { Button } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { CorpusSelect } from '@/components/select-corpus'
import { Checkbox } from '@cads/shared/components/ui/checkbox'

const InputAssisted = z.object({
  corpus_id: z.number({ required_error }).int(),
  subcorpus_id: z.number().int().optional(),
  match_strategy: z.enum(['shortest', 'longest', 'standard'], {
    required_error,
  }),
  items: z
    .array(z.string(), { required_error })
    .min(1, { message: required_error }),
  escape: z.boolean().optional().default(false),
  ignore_case: z.boolean().optional().default(false),
  ignore_diacritics: z.boolean().optional().default(false),
  p: z.string({ required_error }),
  s: z.string({ required_error }),
})

const emptyArray: never[] = []

export function QueryFormAssisted({
  onSuccess,
}: {
  onSuccess?: (queryId: number) => void
}) {
  const { data: corpora } = useSuspenseQuery(corpusList)

  const form = useForm<z.infer<typeof InputAssisted>>({
    resolver: zodResolver(InputAssisted),
    defaultValues: { match_strategy: 'longest' },
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

  useFormFieldDependency(form, 's', selectedCorpus?.s_atts)
  useFormFieldDependency(form, 'p', selectedCorpus?.p_atts)

  const {
    mutate: postQueryAssisted,
    isSuccess,
    isPending,
    error,
  } = useMutation({
    ...createQueryAssisted,
    onSuccess: (data, variables, context) => {
      createQueryAssisted.onSuccess?.(data, variables, context)
      const queryId = data.id
      toast.success('Query created')
      if (queryId !== undefined) {
        onSuccess?.(queryId)
      }
    },
    onError: (...args) => {
      createQueryAssisted.onError?.(...args)
      toast.error('Failed to create query')
    },
  })

  const isDisabled = isPending || isSuccess || isLoadingSubcorpora

  function onSubmit(data: z.infer<typeof InputAssisted>): void {
    postQueryAssisted(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset
          disabled={isDisabled}
          className="@lg:grid-cols-2 grid max-w-3xl grid-cols-2 gap-3"
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
              <FormItem>
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
              <FormItem>
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
          <ErrorMessage error={errorSubcorpora} className="col-span-full" />
        </fieldset>
      </form>
    </Form>
  )
}
