import { useCallback, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, Loader2Icon, Trash2Icon, XIcon } from 'lucide-react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import {
  addConstellationDiscourseme,
  removeConstellationDiscourseme,
  discoursemesList,
  addDescriptionItem,
  createDiscoursemeForConstellationDescription,
  corpusById,
  removeDescriptionItem,
  updateDiscourseme,
} from '@cads/shared/queries'
import { Button, buttonVariants } from '@cads/shared/components/ui/button'
import WordCloud from '@/components/word-cloud'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { ComplexSelect } from '@cads/shared/components/select-complex'
import { LoaderBig } from '@cads/shared/components/loader-big'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@cads/shared/components/ui/collapsible'
import { ScrollArea } from '@cads/shared/components/ui/scroll-area'
import { InputGrowable } from '@cads/shared/components/input-growable'
import { TextTooltip } from '@cads/shared/components/text-tooltip'

import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { useFilterSelection } from './-use-filter-selection'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { AttachNewDiscourseme } from './-attach-new-discourseme'
import { useAnalysisSelection } from './-use-analysis-selection'

export function SemanticMapCollocations({
  constellationId,
}: {
  constellationId: number
}) {
  const { analysisLayer: secondary } = useAnalysisSelection()
  const { description } = useDescription()
  const {
    mapItems,
    isFetching,
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
      x,
      y,
      originX: x,
      originY: y,
      significance: scaled_score,
      discoursemeId: discourseme_id ?? undefined,
      ...w,
    }))
  }, [mapItems])

  const onNewDiscourseme = useCallback(
    (surfaces: string[]) => {
      if (!description || !secondary) return
      postNewDiscourseme({
        surfaces,
        constellationId,
        constellationDescriptionId: description.id,
        p: secondary,
        name: surfaces.join(' ').substring(0, 25),
      })
    },
    [constellationId, description, postNewDiscourseme, secondary],
  )

  const onUpdateDiscourseme = useCallback(
    (discoursemeId: number, surface: string) => {
      const descriptionId = description?.discourseme_descriptions.find(
        ({ discourseme_id }) => discourseme_id === discoursemeId,
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
    },
    [addItem, description?.discourseme_descriptions, secondary],
  )

  return (
    <div className="group/map bg-muted grid h-[calc(100svh-3.5rem)] flex-grow grid-cols-[1rem_1fr_25rem_1rem] grid-rows-[1rem_auto_1fr_4rem] gap-5 overflow-hidden">
      {semantic_map_id !== undefined &&
        semantic_map_id !== null &&
        Boolean(mapItems) && (
          <WordCloud
            className={cn(
              'col-start-2 row-start-3 self-stretch justify-self-stretch',
              {
                'pointer-events-none opacity-50': isFetching,
              },
            )}
            words={words}
            semanticMapId={semantic_map_id}
            onNewDiscourseme={onNewDiscourseme}
            onUpdateDiscourseme={onUpdateDiscourseme}
          />
        )}
      <div className="relative col-span-2 col-start-2 row-start-2 flex gap-3">
        <Link
          to="/constellations/$constellationId"
          from="/constellations/$constellationId/semantic-map"
          params={{ constellationId: constellationId.toString() }}
          search={(s) => s}
          className={cn(
            buttonVariants({ variant: 'default' }),
            'h-full shrink self-stretch justify-self-stretch px-2',
          )}
        >
          <ArrowLeftIcon />
        </Link>

        <ConstellationCollocationFilter className="grow rounded-xl p-2 shadow" />
      </div>
      <ConstellationDiscoursemesEditor
        constellationId={constellationId}
        className="relative col-start-3 row-start-3"
      />
      {isFetching && (
        <LoaderBig className="z-10 col-start-2 row-start-3 self-center justify-self-center" />
      )}
      <div className="col-start-2 row-start-3 self-start justify-self-start">
        <ErrorMessage
          error={[errorCollocation, errorNewDiscourseme, errorAddItem]}
        />
      </div>
    </div>
  )
}

function ConstellationDiscoursemesEditor({
  className,
  constellationId,
}: {
  className?: string
  constellationId: number
}) {
  const { corpusId, focusDiscourseme, clFilterDiscoursemeIds } =
    useFilterSelection('/_app/constellations_/$constellationId')
  const { analysisLayer: secondary } = useAnalysisSelection()
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
    const discoursemeItems = mapData
      .filter(({ source }) => source === 'discourseme_items')
      .toSorted((a, b) => a.item.localeCompare(b.item))
    const discoursemes: {
      discoursemeId: number
      item: string
      descriptionId: number
      items: { score: number; surface: string }[]
    }[] =
      constellationDescription?.discourseme_descriptions?.map(
        (description) => ({
          discoursemeId: description.discourseme_id,
          item:
            allDiscoursemes.find(
              (discourseme) => discourseme.id === description.discourseme_id,
            )?.name ?? 'n.a.',
          descriptionId: description.id,
          items: description.items
            .map(({ surface }) => ({
              surface,
              score:
                discoursemeItems.find(
                  (item) =>
                    item.item === surface &&
                    item.discourseme_id === description.discourseme_id,
                )?.score ?? 0,
            }))
            .filter(
              (item): item is { surface: string; score: number } =>
                typeof item.surface === 'string' &&
                typeof item.score === 'number',
            ),
        }),
      ) ?? []

    return { discoursemes, itemCount: discoursemeItems.length }
  }, [
    allDiscoursemes,
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
    <div
      className={cn(
        'bg-background flex flex-col overflow-hidden rounded-xl shadow-xl',
        className,
      )}
    >
      <ErrorMessage
        error={[errorDeleteDiscourseme, errorAddDiscourseme, errorDeleteItem]}
      />

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
          ({ discoursemeId, items, item, descriptionId }) => {
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
                      'bg-background sticky top-0 flex items-center border-t px-2 pt-1 font-bold',
                      `discourseme-${discoursemeId}`,
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        className="-ml-1 mb-1 flex h-auto flex-grow flex-wrap justify-start gap-2 whitespace-normal p-2 pl-1"
                        variant="ghost"
                      >
                        <span
                          className="aspect-square w-4 rounded-full"
                          style={{
                            backgroundColor: getColorForNumber(discoursemeId),
                          }}
                        />

                        <DiscoursemeName
                          discoursemeId={discoursemeId}
                          item={item}
                          key={item}
                        />

                        <span className="text-muted-foreground">
                          {items.length} items
                        </span>

                        {focusDiscourseme === discoursemeId && (
                          <span className="ml-1 inline-block rounded-xl bg-amber-100 px-2 py-0.5 text-sm text-amber-800 dark:bg-amber-700 dark:text-amber-100">
                            Focus
                          </span>
                        )}

                        {clFilterDiscoursemeIds.includes(discoursemeId) && (
                          <span className="inline-flex items-center gap-0.5 rounded-xl bg-blue-100 px-2 py-0.5 text-sm text-blue-800 has-[a:hover]:bg-blue-200 dark:bg-blue-700 dark:text-blue-100 has-[a:hover]:dark:bg-blue-900">
                            Filter
                            <Link
                              className="hover:cursor-pointer"
                              to=""
                              params={(p) => p}
                              search={(s) => ({
                                ...s,
                                clPageIndex: 0,
                                clFilterDiscoursemeIds: (
                                  s.clFilterDiscoursemeIds ?? []
                                ).filter((id) => id !== discoursemeId),
                              })}
                            >
                              <XIcon className="h-4 w-4" />
                            </Link>
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
                      className="hover:bg-destructive hover:text-destructive-foreground m-0 mb-0.5 h-auto w-10 self-stretch"
                    >
                      <Trash2Icon className="h-4 w-4" />
                      {/*  TODO: Handle case when this is the filter discourseme*/}
                    </Button>
                  </h4>
                  <CollapsibleContent>
                    <ul className="px-2">
                      {items.map(({ surface, score }, index) => (
                        <li
                          key={`${surface} ${discoursemeId}` + index}
                          className="group/description hover:bg-muted flex items-center justify-between rounded pl-1 leading-tight"
                        >
                          <span className="vertical-align-baseline my-auto flex flex-grow items-baseline">
                            <span>{surface}</span>

                            <TextTooltip
                              tooltipText={`Score for "${item}"`}
                              asChild
                            >
                              <span className="text-muted-foreground ml-auto mr-0 font-mono text-sm leading-loose">
                                {score}
                              </span>
                            </TextTooltip>
                          </span>
                          <button
                            className="hover:text-destructive-foreground hover:bg-destructive m-1 mr-1 rounded opacity-0 group-hover/description:opacity-100"
                            disabled={isRemovingItem}
                            onClick={() => {
                              if (descriptionId === undefined) {
                                throw new Error('No descriptionId available')
                              }
                              removeItem({
                                discoursemeId,
                                descriptionId,
                                p: secondary!,
                                surface: surface,
                              })
                            }}
                          >
                            <Trash2Icon className="m-2 h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {descriptionId !== undefined && (
                      <AddDescriptionItem
                        constellationId={constellationId}
                        discoursemeId={discoursemeId}
                        discoursemeDescriptionId={descriptionId}
                      />
                    )}
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

function DiscoursemeName({
  discoursemeId,
  item,
}: {
  discoursemeId: number
  item: string
}) {
  const [currentValue, setCurrentValue] = useState(item)
  const { mutate: patchDiscourseme, isPending } = useMutation({
    ...updateDiscourseme,
    onSuccess: (...args) => {
      updateDiscourseme.onSuccess?.(...args)
      setCurrentValue(args[0].name ?? item)
      toast.success('Discourseme renamed')
    },
    onError: (...args) => {
      updateDiscourseme.onError?.(...args)
      toast.error('Failed to rename discourseme')
    },
  })
  const renameDiscourseme = function (discoursemeId: number, name: string) {
    if (name === currentValue || !item) return
    patchDiscourseme({ discoursemeId, discoursemePatch: { name } })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const newName = new FormData(e.target as HTMLFormElement).get(
          'discoursemeName',
        ) as string
        renameDiscourseme(discoursemeId, newName)
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <InputGrowable
        type="text"
        defaultValue={item}
        name="discoursemeName"
        onBlur={(e) => {
          renameDiscourseme(discoursemeId, e.target.value)
        }}
        disabled={isPending}
        autoComplete="off"
        autoSave="off"
        className="outline-muted-foreground left-2 w-auto rounded border-none bg-transparent outline-none outline-0 outline-offset-1 hover:bg-white focus:ring-0 focus-visible:bg-white focus-visible:outline-1 disabled:opacity-50 dark:hover:bg-black/25 dark:focus-visible:bg-black/25"
        classNameLabel="-my-1 p-1 -mx-1 min-w-[3ch]"
        required
      />
    </form>
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
  const { analysisLayer: secondary } = useAnalysisSelection()
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
