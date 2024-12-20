import { useEffect, useMemo, useState } from 'react'
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
  removeConstellationDiscourseme,
  discoursemesList,
  addDescriptionItem,
  createDiscoursemeForConstellationDescription,
  corpusById,
  removeDescriptionItem,
} from '@cads/shared/queries'
import { Button, buttonVariants } from '@cads/shared/components/ui/button'
import WordCloud from '@/components/word-cloud'
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
  const { secondary } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const { description } = useDescription()
  const {
    mapItems,
    isLoading,
    collocation: { semantic_map_id } = {},
    error: errorCollocation,
  } = useCollocation(constellationId, description?.id)

  const { mutate: postNewDiscourseme, error: errorNewDiscourseme } =
    useMutation({
      ...createDiscoursemeForConstellationDescription,
      onError: (...args) => {
        createDiscoursemeForConstellationDescription.onError?.(...args)
        toast.error('Failed to create discourseme')
      },
      onSuccess: (data, ...rest) => {
        createDiscoursemeForConstellationDescription.onSuccess?.(data, ...rest)
        toast.success('Discourseme created and attached')
      },
    })
  const { mutate: addItem, error: errorAddItem } = useMutation({
    ...addDescriptionItem,
    onError: (...args) => {
      addDescriptionItem.onError?.(...args)
      toast.error('Failed to add surface to disourseme description')
    },
    onSuccess: (data, ...rest) => {
      addDescriptionItem.onSuccess?.(data, ...rest)
      toast.success('Surface successfully added')
    },
  })

  const words = useMemo(() => {
    const words = mapItems?.map ?? []
    return words.map(({ scaled_score, discourseme_id, x, y, ...w }) => ({
      x: x * COORDINATES_SCALE_FACTOR,
      y: y * COORDINATES_SCALE_FACTOR,
      originX: x * COORDINATES_SCALE_FACTOR,
      originY: y * COORDINATES_SCALE_FACTOR,
      significance: scaled_score,
      discoursemeId: discourseme_id ?? undefined,
      ...w,
    }))
  }, [mapItems])

  return (
    <div className="group/map bg-muted flex-grow">
      <ErrorMessage error={errorCollocation} />
      <ErrorMessage error={errorNewDiscourseme} />
      <ErrorMessage error={errorAddItem} />
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
        {semantic_map_id !== undefined &&
          semantic_map_id !== null &&
          Boolean(mapItems) && (
            <WordCloud
              words={words}
              size={COORDINATES_SCALE_FACTOR * 2}
              semanticMapId={semantic_map_id}
              onNewDiscourseme={(surfaces) => {
                if (!description || !secondary) return
                postNewDiscourseme({
                  surfaces,
                  constellationId,
                  constellationDescriptionId: description.id,
                  p: secondary,
                })
              }}
              onUpdateDiscourseme={(discoursemeId, surface) => {
                const descriptionId =
                  description?.discourseme_descriptions.find(
                    ({ id }) => id === discoursemeId,
                  )?.id
                if (descriptionId === undefined) {
                  throw new Error(
                    `No discourseme description found for discourseme id ${descriptionId}`,
                  )
                }
                addItem({
                  discoursemeId,
                  descriptionId,
                  surface,
                  p: secondary!,
                })
              }}
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
  const { corpusId, focusDiscourseme, secondary } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  if (corpusId === undefined) throw new Error('corpusId is undefined')
  const corpusName = useQuery(corpusById(corpusId)).data?.name
  const { data: allDiscoursemes } = useSuspenseQuery(discoursemesList)
  const { description: constellationDescription } = useDescription()
  const { mapItems: collocationItemsMap } = useCollocation(
    constellationId,
    constellationDescription?.id,
  )
  const discoursemeData = useMemo(() => {
    const mapData = collocationItemsMap?.map
    if (!mapData) {
      return { discoursemes: [], itemCount: null }
    }
    const discoursemeItems = mapData.filter(
      ({ source }) => source === 'discourseme_items',
    )
    const discoursemes = mapData
      .filter(({ source }) => source === 'discoursemes')
      .map((discourseme) => {
        const descriptionId =
          constellationDescription?.discourseme_descriptions.find(
            ({ discourseme_id }) =>
              discourseme_id === discourseme.discourseme_id,
          )?.id
        const items = discoursemeItems.filter(
          ({ discourseme_id }) => discourseme_id === discourseme.discourseme_id,
        )
        return { ...discourseme, descriptionId, items }
      })

    return { discoursemes, itemCount: discoursemeItems.length }
  }, [
    collocationItemsMap?.map,
    constellationDescription?.discourseme_descriptions,
  ])
  const { itemCount } = discoursemeData

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
    error: errorDeleteItem,
  } = useMutation(removeDescriptionItem)

  return (
    <div className="bg-background absolute bottom-24 right-4 top-48 flex max-w-96 flex-col overflow-hidden rounded-xl shadow-xl">
      <ErrorMessage error={errorDeleteDiscourseme} />
      <ErrorMessage error={errorAddDiscourseme} />
      <ErrorMessage error={errorDeleteItem} />

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
        {discoursemeData.discoursemes.map(
          ({ discourseme_id: discoursemeId, items, item, descriptionId }) => {
            if (discoursemeId === null) {
              throw new Error(
                `Encountered item with source "description_items" that has no "discourseme_id": ${item}`,
              )
            }
            return (
              <Collapsible key={discoursemeId}>
                <div className="flex flex-col">
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
                        {item}
                        <span className="muted-foreground">
                          {items.length} items
                        </span>
                        {focusDiscourseme === discoursemeId && (
                          <span className="ml-1 inline-block rounded-xl bg-amber-100 px-2 py-0.5 text-sm text-amber-800 dark:bg-amber-700 dark:text-amber-100">
                            Focus
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
                      {/* TODO: sometimes items are duplicates. why? */}
                      {items.map(({ item }, index) => (
                        <li
                          key={item + index}
                          className="group/description hover:bg-muted flex items-center justify-between rounded leading-tight"
                        >
                          {item}
                          <button
                            className="ml-auto mr-1 opacity-0 group-hover/description:opacity-100"
                            disabled={isRemovingItem}
                            onClick={() => {
                              if (descriptionId === undefined) {
                                throw new Error('No descriptionId available')
                              }
                              removeItem({
                                discoursemeId,
                                descriptionId,
                                p: secondary!,
                                surface: item,
                              })
                            }}
                          >
                            <Trash2Icon className="m-2 h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <AddDescriptionItem
                      constellationId={constellationId}
                      discoursemeId={discoursemeId}
                      discoursemeDescriptionId={descriptionId}
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
            if (
              discoursemeId === undefined ||
              constellationDescriptionId === undefined
            ) {
              return
            }
            addDiscourseme({
              constellationId,
              discoursemeId,
              descriptionId: constellationDescriptionId,
            })
          }}
        />
        {constellationDescriptionId !== undefined &&
          secondary !== undefined && (
            <AttachNewDiscourseme
              constellationId={constellationId}
              constellationDescriptionId={constellationDescriptionId}
              p={secondary}
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
  const { mapItems: collocationItemsMap } = useCollocation(
    constellationId,
    description?.id,
  )

  const mapItems = useMemo(
    () =>
      (collocationItemsMap?.map ?? [])
        .filter(({ source }) => source === 'items')
        .map(({ item }) => ({
          id: item,
          name: item,
          searchValue: item,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [collocationItemsMap],
  )

  return (
    <>
      <ErrorMessage error={errorAddItem} />
      <ComplexSelect
        className="m-2"
        selectMessage="Select description item to add"
        disabled={isAddingItem}
        items={mapItems}
        onChange={(itemId) => {
          if (itemId === undefined) return
          const surface = mapItems.find(({ id }) => id === itemId)?.name
          if (surface === undefined || secondary === undefined) {
            console.warn('Could not add item, missing values', {
              surface,
              secondary,
            })
            return
          }
          return void addItem({
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
  p,
}: {
  className?: string
  constellationId: number
  constellationDescriptionId: number
  p: string
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

  useEffect(() => {
    if (!isOpen) form.reset()
  }, [isOpen, form])

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
                p,
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
