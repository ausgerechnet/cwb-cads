import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Link } from '@tanstack/react-router'
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

import { cn } from '@cads/shared/lib/utils'
import {
  addConstellationDiscourseme,
  constellationById,
  removeConstellationDiscourseme,
  discoursemesList,
  addDescriptionItem,
  createDiscoursemeForConstellationDescription,
  corpusById,
} from '@cads/shared/queries'
import { Button, buttonVariants } from '@cads/shared/components/ui/button'
import WordCloud, { Word } from '@/components/word-cloud'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { ComplexSelect } from '@cads/shared/components/select-complex'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@cads/shared/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { ItemsInput } from '@cads/shared/components/ui/items-input'
import { Alert, AlertDescription } from '@cads/shared/components/ui/alert'
import { required_error } from '@cads/shared/lib/strings'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@cads/shared/components/ui/collapsible'
import { ScrollArea } from '@cads/shared/components/ui/scroll-area'
import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { useFilterSelection } from './-use-filter-selection'

const COORDINATES_SCALE_FACTOR = 1_000 // Coordinates range from -1 to 1 in both axes

export function SemanticMap({ constellationId }: { constellationId: number }) {
  const { description } = useDescription()
  const {
    collocationItemsMap,
    isLoading,
    collocation: { semantic_map_id } = {},
    error: errorCollocation,
  } = useCollocation(constellationId, description?.id)

  const words = useMemo(() => {
    return (collocationItemsMap?.items ?? [])
      .map((item): Word | null => {
        const coordinates = collocationItemsMap?.coordinates.find(
          (coordinates) => coordinates.item === item.item,
        )
        if (!coordinates) {
          console.warn('No coordinates for item:', item)
          return null
        }
        return {
          discoursemes:
            description?.discourseme_descriptions
              .filter((dd) => dd.items.some((i) => i.surface === item.item))
              .map((dd) => dd.id) ?? [],
          id: item.item,
          word: item.item,
          x: (coordinates.x_user ?? coordinates.x) * COORDINATES_SCALE_FACTOR,
          y: (coordinates.y_user ?? coordinates.y) * COORDINATES_SCALE_FACTOR,
          originX:
            (coordinates.x_user ?? coordinates.x) * COORDINATES_SCALE_FACTOR,
          originY:
            (coordinates.y_user ?? coordinates.y) * COORDINATES_SCALE_FACTOR,
          significance: 0.5, // TODO: Will be replaced by a value from the backend
          radius: 20,
        }
      })
      .filter((w): w is Word => w !== null)
  }, [
    collocationItemsMap?.coordinates,
    collocationItemsMap?.items,
    description?.discourseme_descriptions,
  ])

  return (
    <div className="group/map bg-muted flex-grow">
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
        {semantic_map_id !== undefined && semantic_map_id !== null && (
          <WordCloud
            words={words}
            size={COORDINATES_SCALE_FACTOR * 2}
            semanticMapId={semantic_map_id}
          />
        )}
      </div>
    </div>
  )
}

function ConstellationDiscoursemesEditor({
  constellationId,
}: {
  constellationId: number
}) {
  const { corpusId, focusDiscourseme } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  if (corpusId === undefined) throw new Error('corpusId is undefined')
  const corpusName = useQuery(corpusById(corpusId)).data?.name
  const {
    data: { discoursemes },
    error: errorDiscoursemes,
  } = useSuspenseQuery(constellationById(constellationId))
  const { data: allDiscoursemes } = useSuspenseQuery(discoursemesList)
  const { description: constellationDescription } = useDescription()
  const { collocationItemsMap } = useCollocation(
    constellationId,
    constellationDescription?.id,
  )
  const itemCount = collocationItemsMap?.items.length
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
  return (
    <div className="bg-background absolute bottom-24 right-4 top-48 flex w-96 flex-col overflow-hidden rounded-xl shadow-xl">
      <ErrorMessage error={errorDiscoursemes} />
      <ErrorMessage error={errorDeleteDiscourseme} />
      <ErrorMessage error={errorAddDiscourseme} />
      <div className="flex justify-between p-2 pr-3">
        <span>
          <strong>Corpus:</strong> {corpusName ?? <>...</>}
        </span>
        <span>{itemCount ?? '...'} Items</span>
      </div>
      {constellationDescriptionId === undefined && (
        <div className="flex w-full flex-grow place-content-center place-items-center">
          <Loader2Icon className="h-6 w-6 animate-spin" />
        </div>
      )}
      <ScrollArea className="flex-grow">
        {collocationItemsMap?.discourseme_scores.map(
          ({
            discourseme_id: discoursemeId,
            unigram_item_scores: unigramItemScores,
          }) => {
            const discoursemeDescriptionId =
              constellationDescription?.discourseme_descriptions.find(
                (dd) => dd.discourseme_id === discoursemeId,
              )?.id
            if (discoursemeDescriptionId === undefined)
              throw new Error('Discourseme description not found')
            return (
              <Collapsible key={discoursemeId}>
                <div className="flex w-96 flex-col">
                  <h4
                    className={cn(
                      'bg-background sticky top-0 flex items-center border-t px-2 pt-2 font-bold',
                      `discourseme-${discoursemeId}`,
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        className="-ml-1 mb-1 flex h-auto flex-grow justify-start gap-2 p-2 pl-1"
                        variant="ghost"
                      >
                        <span
                          className="aspect-square w-5 rounded-full"
                          style={{
                            backgroundColor: getColorForNumber(discoursemeId),
                          }}
                        />
                        {
                          discoursemes.find(({ id }) => id === discoursemeId)
                            ?.name
                        }
                        <span className="muted-foreground">
                          {unigramItemScores.length} items
                        </span>
                        {focusDiscourseme === discoursemeId && (
                          <span className="ml-1 inline-block rounded-xl bg-amber-100 px-2 py-0.5 text-sm text-amber-800 dark:bg-amber-700 dark:text-amber-100">
                            Focus Discourseme
                          </span>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isRemovingDiscourseme}
                      onClick={() =>
                        removeDiscourseme({ constellationId, discoursemeId })
                      }
                    >
                      <Trash2Icon className="h-4 w-4" />
                      {/*  TODO: Handle case when this is the filter discourseme*/}
                    </Button>
                  </h4>
                  <CollapsibleContent>
                    <ul className="px-2">
                      {unigramItemScores.map(({ item }) => (
                        <li
                          key={item}
                          className="group/description hover:bg-muted flex items-center justify-between rounded leading-tight"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                    <AddDescriptionItem
                      constellationId={constellationId}
                      discoursemeId={discoursemeId}
                      discoursemeDescriptionId={discoursemeDescriptionId}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          },
        )}
      </ScrollArea>
      <div className="bg-muted flex flex-col gap-1 border-t p-2">
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
  const { secondary } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const { description } = useDescription()
  const { collocationItemsMap } = useCollocation(
    constellationId,
    description?.id,
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
