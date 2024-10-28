import { Card } from '@cads/shared/components/ui/card'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { AppPageFrame } from '@/components/app-page-frame'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { Button } from '@cads/shared/components/ui/button'
import { ItemsInput } from '@cads/shared/components/ui/items-input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { schemas } from '@/rest-client'
import {
  addDiscoursemeDescription,
  corpusList,
  discoursemeById,
  subcorpusOf,
} from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { CorpusSelect } from '@/components/select-corpus'
import { useMemo } from 'react'
import { useFormFieldDependency } from '@cads/shared/lib/use-form-field-dependency'
import { Large } from '@cads/shared/components/ui/typography'

export const Route = createLazyFileRoute(
  '/_app/discoursemes_/$discoursemeId_/new-description',
)({
  component: DiscoursemeDescriptionNew,
})

const FormInput =
  // copy/paste of DiscoursemeDescriptionIn / the z.ZodType<> doesn't allow .extend()
  z
    .object({
      corpus_id: z.number().int(),
      match_strategy: z
        .enum(['longest', 'shortest', 'standard'])
        .optional()
        .default('longest'),
      s: z.string().optional(),
      subcorpus_id: z.number().int().nullish(),
    })
    .extend({
      discourseme_id: z.number(),
      items: z.string().array().nonempty(),
      p: z.string(),
    })

function DiscoursemeDescriptionNew() {
  const navigate = useNavigate()
  const discoursemeId = parseInt(Route.useParams().discoursemeId)

  const { data: discourseme } = useSuspenseQuery(discoursemeById(discoursemeId))
  const { data: corpora } = useSuspenseQuery(corpusList)

  const { mutate, isPending, error } = useMutation({
    ...addDiscoursemeDescription,
    onSuccess: (data, ...args) => {
      const discoursemeId = data.discourseme_id
      addDiscoursemeDescription.onSuccess?.(data, ...args)
      toast.success('Discourseme description created')
      if (discoursemeId === undefined) return
      void navigate({
        to: `/discoursemes/$discoursemeId`,
        params: { discoursemeId: discoursemeId.toString() },
      })
    },
    onError: (...args) => {
      addDiscoursemeDescription.onError?.(...args)
      toast.error('Failed to create discourseme description')
    },
  })

  const form = useForm<z.infer<typeof FormInput>>({
    resolver: zodResolver(schemas.DiscoursemeDescriptionIn),
    defaultValues: {
      discourseme_id: discoursemeId,
      match_strategy: 'longest',
      items: [],
    },
  })

  const corpusId = form.watch('corpus_id')

  const { data: subcorpora = [] } = useQuery({
    ...subcorpusOf(corpusId),
    enabled: corpusId !== undefined,
    select: (data) =>
      data.map((subcorpus) => ({
        cwb_id: subcorpus.corpus?.cwb_id,
        description: subcorpus.description,
        id: subcorpus.id,
        language: subcorpus.corpus?.language,
        name: subcorpus.name,
        p_atts: subcorpus.corpus?.p_atts,
        register: subcorpus.corpus?.register,
        s_annotations: subcorpus.corpus?.s_annotations,
        s_atts: subcorpus.corpus?.s_atts,
      })),
  })

  const [pAttributes, sAttributes] = useMemo(() => {
    const { p_atts = [], s_atts = [] } =
      corpora?.find((c) => c.id === corpusId) ?? {}
    return [p_atts, s_atts]
  }, [corpusId, corpora])

  useFormFieldDependency(form, 'p', pAttributes)
  useFormFieldDependency(form, 's', sAttributes)

  return (
    <AppPageFrame title="New Discourseme Description">
      <Card className="max-w-lg p-4">
        <Large>New Description for Discourseme {discourseme?.name}</Large>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(({ items, p, ...data }) => {
              mutate({
                ...data,
                items: items.map((surface) => ({
                  surface,
                  p,
                  // TODO: cqp_query missing -- where would this come from?
                })),
              })
            })}
            className="grid w-full grid-cols-2 gap-4"
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
                  <FormLabel>Subcorpus</FormLabel>
                  <FormControl>
                    <CorpusSelect
                      className="w-full"
                      corpora={subcorpora}
                      corpusId={field.value ?? undefined}
                      onChange={field.onChange}
                      disabled={!subcorpora.length}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discourseme_id"
              render={() => <input type="hidden" value={discoursemeId} />}
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
              name="s"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Break</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!sAttributes.length}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Context Break" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {sAttributes.map((attr) => (
                            <SelectItem key={attr} value={attr}>
                              {attr}
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
              name="p"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Analysis Layer</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!pAttributes.length}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Analysis Layer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {pAttributes.map((attr) => (
                            <SelectItem key={attr} value={attr}>
                              {attr}
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

            <Button
              className="col-span-full w-full flex-grow"
              disabled={isPending}
              type="submit"
            >
              {isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Start Analysis
            </Button>
            <ErrorMessage error={error} className="col-span-full" />
          </form>
        </Form>
      </Card>

      <Card className="max-w-lg p-4">
        {JSON.stringify(discourseme, null, 2)}
        {JSON.stringify(corpora, null, 2)}
      </Card>
    </AppPageFrame>
  )
}
