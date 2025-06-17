import { useMemo } from 'react'
import { Loader2Icon, Trash2Icon, XIcon } from 'lucide-react'
import { useQuery, useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'

import { CollapsibleTrigger } from '@cads/shared/components/ui/collapsible'
import { cn } from '@cads/shared/lib/utils'
import {
  addConstellationDiscourseme,
  removeConstellationDiscourseme,
  discoursemesList,
  corpusById,
  removeDescriptionItem,
} from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Button } from '@cads/shared/components/ui/button'
import { ScrollArea } from '@cads/shared/components/ui/scroll-area'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import {
  Collapsible,
  CollapsibleContent,
} from '@cads/shared/components/ui/collapsible'
import { TextTooltip } from '@cads/shared/components/text-tooltip'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { schemas } from '@cads/shared/api-client'

import { useFilterSelection } from '../-use-filter-selection'
import { useDescription } from '../-use-description'
import { Route } from '../route'
import { DiscoursemeNameEdit } from './-discourseme-name-edit'
import { AddDescriptionItem } from './-add-description-item'
import { AttachNewDiscourseme } from './-attach-new-discourseme'

const emptyArray: readonly z.infer<typeof schemas.ConstellationMapItemOut>[] =
  []

export function ConstellationDiscoursemesEditor({
  className,
  analysisLayer,
  mapItems = emptyArray,
}: {
  className?: string
  analysisLayer: string
  mapItems?: readonly z.infer<typeof schemas.ConstellationMapItemOut>[]
}) {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { corpusId, focusDiscourseme, clFilterDiscoursemeIds } =
    useFilterSelection('/_app/constellations_/$constellationId')
  if (corpusId === undefined) throw new Error('corpusId is undefined')
  const corpusName = useQuery(corpusById(corpusId)).data?.name
  const { data: allDiscoursemes } = useSuspenseQuery(discoursemesList)
  const { description: constellationDescription } = useDescription()
  const discoursemeData = useMemo(() => {
    if (!mapItems) {
      return { discoursemes: [], itemCount: null }
    }
    const discoursemeItems = mapItems
      .filter(({ source }) => source === 'discourseme_items')
      .toSorted((a, b) => a.item.localeCompare(b.item))
    const discoursemes = mapItems
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
  }, [mapItems, constellationDescription?.discourseme_descriptions])
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
                          className="aspect-square w-5 rounded-full"
                          style={{
                            backgroundColor: getColorForNumber(discoursemeId),
                          }}
                        />

                        <DiscoursemeNameEdit
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
                              to="."
                              params={(p) => p}
                              search={(s) => ({
                                ...s,
                                clPageIndex: 0,
                                clFilterDiscoursemeIds: (
                                  (s.clFilterDiscoursemeIds as
                                    | number[]
                                    | undefined) ?? []
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
                      {/* TODO: sometimes items are duplicates. why? */}
                      {items.map(({ item, discourseme_id, score }, index) => (
                        <li
                          key={`${item} ${discourseme_id}` + index}
                          className="group/description hover:bg-muted flex items-center justify-between rounded pl-1 leading-tight"
                        >
                          <span className="vertical-align-baseline my-auto flex flex-grow items-baseline">
                            <span>{item}</span>

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
                            className="hover:text-destructive-foreground hover:bg-destructive m-1 ml-auto mr-1 rounded opacity-0 group-hover/description:opacity-100"
                            disabled={isRemovingItem}
                            onClick={() => {
                              if (descriptionId === undefined) {
                                throw new Error('No descriptionId available')
                              }
                              removeItem({
                                discoursemeId,
                                descriptionId,
                                p: analysisLayer,
                                surface: item,
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
            })
          }}
        />

        {constellationDescriptionId !== undefined &&
          analysisLayer !== undefined && (
            <AttachNewDiscourseme
              constellationDescriptionId={constellationDescriptionId}
              p={analysisLayer}
            />
          )}
      </div>
    </div>
  )
}
