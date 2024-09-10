import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Link, useSearch } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeftIcon,
  Loader2,
  Loader2Icon,
  Plus,
  Trash2Icon,
} from 'lucide-react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { cn } from '@/lib/utils'
import {
  addConstellationDiscourseme,
  constellationById,
  constellationDescriptionFor,
  removeConstellationDiscourseme,
  discoursemesList,
  addDescriptionItem,
  removeDescriptionItem,
  createDiscoursemeForConstellationDescription,
} from '@/lib/queries'
import { Button, buttonVariants } from '@/components/ui/button'
import WordCloud, { Word } from '@/components/word-cloud'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { ComplexSelect } from '@/components/select-complex'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ItemsInput } from '@/components/ui/items-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { required_error } from '@/lib/strings'
import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { useFilterSelection } from './-use-filter-selection'
import { getColorForNumber } from '@/lib/get-color-for-number'

const COORDINATES_SCALE_FACTOR = 40

export function SemanticMap({ constellationId }: { constellationId: number }) {
  const { description } = useDescription()
  const {
    collocationItemsMap,
    isLoading,
    error: errorCollocation,
  } = useCollocation(constellationId, description?.id, description?.corpus_id)
  const sortBy = useFilterSelection(
    '/_app/constellations/$constellationId',
    description?.corpus_id,
  ).ccSortBy

  const words = useMemo(() => {
    const { min, max } = (collocationItemsMap?.items ?? []).reduce(
      (acc, item) => {
        const score = item.scores.find((m) => m.measure === sortBy)?.score
        if (score === undefined) return acc
        if (score < acc.min) acc.min = score
        if (score > acc.max) acc.max = score
        return acc
      },
      { min: Infinity, max: -Infinity },
    )
    return (collocationItemsMap?.coordinates ?? []).map((item): Word => {
      const score = collocationItemsMap?.items
        ?.find((i) => i.item === item.item)
        ?.scores.find((m) => m.measure === sortBy)?.score
      if (score === undefined)
        throw new Error(`score is undefined for item ${item.item}`)
      return {
        discoursemes:
          description?.discourseme_descriptions
            .filter((dd) => dd.items.some((i) => i.surface === item.item))
            .map((dd) => dd.id) ?? [],
        id: item.item,
        word: item.item,
        x: (item.x_user ?? item.x) * COORDINATES_SCALE_FACTOR,
        y: (item.y_user ?? item.y) * COORDINATES_SCALE_FACTOR,
        originX: (item.x_user ?? item.x) * COORDINATES_SCALE_FACTOR,
        originY: (item.y_user ?? item.y) * COORDINATES_SCALE_FACTOR,
        significance: (score - min) / (max - min),
        radius: 20,
      }
    })
  }, [
    collocationItemsMap?.coordinates,
    collocationItemsMap?.items,
    description?.discourseme_descriptions,
    sortBy,
  ])

  return (
    <div className="group/map flex-grow bg-muted">
      <ErrorMessage error={errorCollocation} />
      <Link
        to="/constellations/$constellationId"
        from="/constellations/$constellationId/semantic-map"
        params={{ constellationId: constellationId.toString() }}
        search={(s) => s}
        className={cn(
          buttonVariants({ variant: 'link' }),
          'top-42 absolute right-2 z-10 px-2',
        )}
      >
        <ArrowLeftIcon />
      </Link>
      <ConstellationDiscoursemesEditor constellationId={constellationId} />
      {isLoading && (
        <div className="-transform-x-1/2 -transform-y-1/2 absolute left-1/2 top-1/2">
          <Loader2Icon className="h-6 w-6 animate-spin" />
        </div>
      )}
      <div className="bg-muted">
        <WordCloud words={words} />
      </div>
    </div>
  )
}

function ConstellationDiscoursemesEditor({
  constellationId,
}: {
  constellationId: number
}) {
  const { corpusId, focusDiscourseme } = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  if (corpusId === undefined) throw new Error('corpusId is undefined')
  const { s } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const {
    data: { discoursemes },
  } = useSuspenseQuery(constellationById(constellationId))
  const { data: allDiscoursemes } = useSuspenseQuery(discoursemesList)
  const { data: constellationDescription, error: errorDiscoursemes } = useQuery(
    constellationDescriptionFor({
      constellationId,
      // TODO
      corpusId,
      subcorpusId: null,
      matchStrategy: 'longest',
      s,
    }),
  )
  const constellationDescriptionId = constellationDescription?.id
  const {
    mutate: addDiscourseme,
    isPending,
    error: errorAddDiscourseme,
  } = useMutation(addConstellationDiscourseme)
  const {
    mutate: removeDiscourseme,
    isPending: isRemovingDiscourseme,
    error: errorDeleteDiscourseme,
  } = useMutation(removeConstellationDiscourseme)
  const {
    mutate: removeItem,
    isPending: isRemovingItem,
    error: errorRemoveItem,
  } = useMutation(removeDescriptionItem)
  return (
    <div className="absolute bottom-24 right-4 top-64 flex flex-col overflow-hidden rounded-xl bg-background shadow-xl">
      <ErrorMessage error={errorDiscoursemes} />
      <ErrorMessage error={errorDeleteDiscourseme} />
      <ErrorMessage error={errorRemoveItem} />
      <ErrorMessage error={errorAddDiscourseme} />
      {constellationDescriptionId === undefined && (
        <div className="flex w-full flex-grow place-content-center place-items-center">
          <Loader2Icon className="h-6 w-6 animate-spin" />
        </div>
      )}
      <div className="flex-grow overflow-auto">
        {constellationDescription?.discourseme_descriptions.map(
          (discoursemeDescription) => (
            <div key={discoursemeDescription.id} className="flex flex-col">
              <h4
                className={cn(
                  'sticky top-0 flex items-center border-t bg-background px-2 pt-2 font-bold',
                  `discourseme-${discoursemeDescription.discourseme_id}`,
                )}
              >
                <span
                  className="mr-2 aspect-square w-5 rounded-full"
                  style={{
                    backgroundColor: getColorForNumber(
                      discoursemeDescription.id,
                    ),
                  }}
                />
                {
                  discoursemes.find(
                    ({ id }) => id === discoursemeDescription.discourseme_id,
                  )?.name
                }
                {focusDiscourseme === discoursemeDescription.discourseme_id && (
                  <span className="ml-1 inline-block rounded-xl bg-amber-100 px-2 py-0.5 text-sm text-amber-800 dark:bg-amber-700 dark:text-amber-100">
                    Focus Discourseme
                  </span>
                )}
                <Button
                  className="ml-auto"
                  variant="ghost"
                  size="icon"
                  disabled={isRemovingDiscourseme}
                  onClick={() =>
                    removeDiscourseme({
                      constellationId,
                      discoursemeId: discoursemeDescription.discourseme_id,
                    })
                  }
                >
                  <Trash2Icon className="h-4 w-4" />
                  {/*  TODO: Handle case when this is the filter discourseme*/}
                </Button>
              </h4>
              <ul className="px-2">
                {discoursemeDescription.items.map((item) => (
                  <li
                    key={item.surface}
                    className="group/description flex max-w-md items-center rounded leading-tight hover:bg-muted"
                  >
                    {item.surface}
                    <button
                      className="ml-auto mr-1 opacity-0 group-hover/description:opacity-100"
                      onClick={() =>
                        removeItem({
                          discoursemeId: discoursemeDescription.discourseme_id,
                          descriptionId: discoursemeDescription.id,
                          // cqpQuery: item.cqp_query,
                          p: item.p!,
                          surface: item.surface!,
                        })
                      }
                      disabled={isRemovingItem}
                    >
                      <Trash2Icon className="m-2 h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <AddDescriptionItem
                constellationId={constellationId}
                discoursemeId={discoursemeDescription.discourseme_id}
                discoursemeDescriptionId={discoursemeDescription.id}
              />
            </div>
          ),
        )}
      </div>
      <div className="flex flex-col gap-1 border-t bg-muted p-2">
        <DiscoursemeSelect
          undefinedName="Select Discourseme to add to constellation"
          disabled={isPending}
          discoursemes={allDiscoursemes}
          onChange={(discoursemeId) => {
            if (discoursemeId === undefined) return
            addDiscourseme({
              constellationId,
              discoursemeId,
            })
          }}
        />
        {constellationDescriptionId !== undefined && (
          <AttachNewDiscourseme
            constellationId={constellationId}
            constellationDescriptionId={constellationDescriptionId}
          />
        )}
      </div>
    </div>
  )
}

function AddDescriptionItem({
  discoursemeDescriptionId,
  discoursemeId,
  constellationId,
}: {
  discoursemeDescriptionId: number
  discoursemeId: number
  constellationId: number
}) {
  const {
    mutate: addItem,
    isPending: isAddingItem,
    error: errorAddItem,
  } = useMutation(addDescriptionItem)
  const { corpusId } = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const { secondary } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const { description } = useDescription()
  const { collocationItemsMap } = useCollocation(
    constellationId,
    description?.id,
    description?.corpus_id,
  )
  const collocationItems = useMemo(
    () =>
      (collocationItemsMap?.items ?? []).map(({ item }, id) => ({
        id,
        name: item,
        searchValue: item,
      })),
    [collocationItemsMap],
  )

  return (
    <>
      <ErrorMessage error={errorAddItem} />
      <ComplexSelect
        className="m-2"
        selectMessage="Select description item to add"
        disabled={isAddingItem}
        items={collocationItems}
        onChange={(itemIndex) => {
          if (itemIndex === undefined) return
          const surface = collocationItemsMap?.items[itemIndex]?.item
          if (surface === undefined || secondary === undefined) {
            console.warn('Could not add item, missing values', {
              surface,
              secondary,
            })
            return
          }
          console.log('selected surface', surface)
          addItem({
            discoursemeId,
            descriptionId: discoursemeDescriptionId,
            surface: surface,
            p: secondary,
          })
        }}
      />
    </>
  )
}

const Discourseme = z.object({
  surfaces: z.array(z.string({ required_error }), { required_error }),
})

type Discourseme = z.infer<typeof Discourseme>

function AttachNewDiscourseme({
  className,
  constellationId,
  constellationDescriptionId,
}: {
  className?: string
  constellationId: number
  constellationDescriptionId: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    mutate: postNewDiscourseme,
    isPending,
    error,
  } = useMutation({
    ...createDiscoursemeForConstellationDescription,
    onError: (...args) => {
      createDiscoursemeForConstellationDescription.onError?.(...args)
      toast.error('Failed to create discourseme')
    },
    onSuccess: (data, ...rest) => {
      createDiscoursemeForConstellationDescription.onSuccess?.(data, ...rest)
      toast.success('Discourseme created and attached')
      setIsOpen(false)
    },
  })

  const form = useForm<Discourseme>({
    resolver: zodResolver(Discourseme),
    disabled: isPending,
    defaultValues: {
      surfaces: [],
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(className, 'aspect-square')}
              >
                Create new Discourseme to add
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Create a new discourseme</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((discourseme) =>
              postNewDiscourseme({
                surfaces: discourseme.surfaces,
                constellationId,
                constellationDescriptionId,
              }),
            )}
          >
            <fieldset disabled={isPending} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="surfaces"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Items</FormLabel>
                    <FormControl>
                      <ItemsInput
                        onChange={field.onChange}
                        defaultValue={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="animation-spin mr-2 h-4 w-4" />
                )}
                New Discourseme
              </Button>
              {error && (
                <Alert>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}
            </fieldset>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
