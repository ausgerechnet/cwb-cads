import { useState } from 'react'
import {
  useMutation,
  useSuspenseQuery,
  useIsMutating,
  useQuery,
} from '@tanstack/react-query'
import {
  createLazyFileRoute,
  Link,
  useRouterState,
} from '@tanstack/react-router'
import {
  Loader2Icon,
  MapIcon,
  PencilIcon,
  PencilOffIcon,
  XIcon,
} from 'lucide-react'
import { z } from 'zod'

import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@cads/shared/components/ui/card'
import { Headline3, Muted, Small } from '@cads/shared/components/ui/typography'
import { Button } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { Drawer } from '@/components/drawer'
import { Label } from '@cads/shared/components/ui/label'
import { AssociationMatrix } from '@cads/shared/components/association-matrix'
import {
  addConstellationDiscourseme,
  constellationById,
  removeConstellationDiscourseme,
  discoursemesList,
  constellationDescriptionAssociations,
} from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils.ts'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { schemas } from '@/rest-client'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'
import { SemanticMap } from './-semantic-map'
import { useDescription } from './-use-description'
import { SemanticMapPreview } from './-semantic-map-preview'
import { useFilterSelection } from './-use-filter-selection'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  // TODO: update @tanstack/react-router to use `useMatch` with 'shouldThrow: false'
  const showsSemanticMap =
    useRouterState().matches.find(
      (match) =>
        match.routeId === '/_app/constellations_/$constellationId/semantic-map',
    ) !== undefined
  const constellationId = parseInt(Route.useParams().constellationId)

  const {
    setFilter,
    setFilters,
    corpusId,
    subcorpusId,
    isConcordanceVisible,
    focusDiscourseme,
  } = useFilterSelection('/_app/constellations_/$constellationId')

  const {
    data: { comment, name, discoursemes: constellationDiscoursemes = [] },
  } = useSuspenseQuery(constellationById(constellationId))
  const { description, isLoadingDescription, errorDescription } =
    useDescription()
  const {
    mutate: addDiscourseme,
    isPending,
    error: errorAddDiscourseme,
  } = useMutation(addConstellationDiscourseme)
  const { data: discoursemes = [] } = useQuery(discoursemesList)

  const [isEditMode, setIsEditMode] = useState(false)

  const nonSelectedDiscoursemes = discoursemes.filter(
    (discourseme) =>
      !constellationDiscoursemes?.find(({ id }) => id === discourseme.id),
  )

  const constellationIds = (description?.discourseme_descriptions ?? []).map(
    (d) => d.discourseme_id,
  )
  const discoursemesInDescription = discoursemes.filter((d) =>
    constellationIds.includes(d.id),
  )

  const isMapAvailable =
    corpusId !== undefined && focusDiscourseme !== undefined

  return (
    <AppPageFrame
      title={showsSemanticMap ? undefined : 'Constellation'}
      classNameContainer={cn('flex-grow pb-0', showsSemanticMap && 'p-0')}
      classNameContent={cn('relative', showsSemanticMap && 'p-0')}
    >
      <ErrorMessage error={errorDescription} />
      {!showsSemanticMap && (
        <>
          <Headline3 className="border-0">{name}</Headline3>
          {comment && <Muted>{comment}</Muted>}
          <div className="mt-4 grid grid-cols-[3fr_1fr] gap-5">
            <Card className="mx-0 grid w-full grid-cols-1 grid-rows-[min-content_1fr] gap-x-4 gap-y-0 p-4">
              <div className="mb-2 flex place-items-center font-bold">
                Discoursemes
                <Button
                  variant="outline"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="m-0 ml-auto flex h-6 gap-1 p-0 pl-1 pr-2"
                >
                  {!isEditMode ? (
                    <PencilIcon size={16} />
                  ) : (
                    <PencilOffIcon size={16} />
                  )}
                  Edit
                </Button>
              </div>
              <div className="col-span-full flex flex-col gap-2">
                {constellationDiscoursemes.map((discourseme) => (
                  <DiscoursemeItem
                    key={discourseme.id!}
                    discourseme={discourseme}
                    constellationId={constellationId}
                    isEditable={isEditMode}
                  />
                ))}
              </div>
              {isEditMode && (
                <DiscoursemeSelect
                  className="mt-2"
                  discoursemes={nonSelectedDiscoursemes}
                  disabled={isPending}
                  onChange={(discoursemeId) => {
                    addDiscourseme({
                      discoursemeId: discoursemeId as number,
                      constellationId,
                      descriptionId: description?.id as number,
                    })
                  }}
                />
              )}
              <ErrorMessage error={errorAddDiscourseme} className="mt-2" />
            </Card>
            <Link
              to="/constellations/$constellationId/semantic-map"
              from="/constellations/$constellationId"
              params={{ constellationId: constellationId.toString() }}
              search={(s) => s}
              disabled={!isMapAvailable}
              className={cn('transition-opacity focus-visible:outline-none', {
                'opacity-50': !isMapAvailable,
                'group/map-link': isMapAvailable,
              })}
            >
              <Card className="bg-muted text-muted-foreground group-focus-visible/map-link:outline-muted-foreground group-hover/map-link:outline-muted-foreground relative mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 overflow-hidden p-4 text-center outline outline-1 outline-transparent transition-all duration-200">
                <SemanticMapPreview className="absolute h-full w-full scale-110 transition-all group-hover/map-link:scale-100 group-hover/map-link:opacity-75 group-focus-visible/map-link:scale-100" />
                <div className="bg-muted/70 group-focus-visible/map-link:bg-muted/90 group-hover/map-link:bg-muted/90 transition-color relative flex gap-3 rounded p-2">
                  <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                  <span>Semantic Map</span>
                </div>
                {(corpusId === undefined || focusDiscourseme === undefined) && (
                  <div className="relative flex flex-col gap-1 rounded bg-amber-200 p-2 text-amber-800">
                    {corpusId === undefined && (
                      <div>Select a corpus to view the map</div>
                    )}{' '}
                    {focusDiscourseme === undefined && (
                      <div>Select a focus discourseme to view the map</div>
                    )}
                  </div>
                )}
              </Card>
            </Link>
          </div>
          <div className="mt-4 flex gap-1">
            <Label>
              Subcorpus
              <div className="relative mt-1">
                <SelectSubcorpus
                  onChange={(corpusId, subcorpusId) => {
                    void setFilters({
                      corpusId: corpusId,
                      subcorpusId: subcorpusId,
                    })
                  }}
                  corpusId={corpusId}
                  subcorpusId={subcorpusId}
                />
              </div>
            </Label>
            <Label>
              Focus Discourseme:
              <div className="relative mt-1">
                <DiscoursemeSelect
                  discoursemes={discoursemesInDescription}
                  discoursemeId={focusDiscourseme}
                  onChange={(discoursemeId) => {
                    void setFilters({
                      ccPageNumber: 1,
                      focusDiscourseme: discoursemeId,
                    })
                  }}
                  disabled={isLoadingDescription}
                  className="w-full"
                />
                {isLoadingDescription && (
                  <Loader2Icon className="absolute left-1/2 top-2 animate-spin" />
                )}
              </div>
            </Label>
          </div>
          {description?.id !== undefined && (
            <Card className="my-4">
              <DescriptionAssociation
                constellationId={constellationId}
                descriptionId={description.id}
              />
            </Card>
          )}
        </>
      )}
      {corpusId !== undefined && (
        <>
          {showsSemanticMap ? (
            <SemanticMap constellationId={constellationId}>
              <ConstellationCollocationFilter
                className="grow rounded-xl p-2 shadow"
                hideSortOrder
              />
            </SemanticMap>
          ) : (
            <ConstellationCollocationFilter className="sticky top-14 mb-8" />
          )}

          {focusDiscourseme !== undefined && !showsSemanticMap && (
            <Collocation
              constellationId={constellationId}
              descriptionId={description?.id}
            />
          )}
          <Drawer
            className={cn(
              'z-20 -mx-2',
              showsSemanticMap && 'absolute left-0 right-0 mx-0 w-full',
            )}
            isVisible={isConcordanceVisible}
            onToggle={(isVisible) =>
              setFilter('isConcordanceVisible', isVisible)
            }
          >
            <ConstellationConcordanceLines
              corpusId={corpusId}
              constellationId={constellationId}
            />
          </Drawer>
        </>
      )}
    </AppPageFrame>
  )
}

function DiscoursemeItem({
  discourseme,
  constellationId,
  isEditable,
}: {
  discourseme: z.infer<typeof schemas.DiscoursemeOut>
  constellationId: number
  isEditable: boolean
}) {
  const discoursemeId = discourseme.id
  const { mutate: removeConstellationFromDiscourseme, error } = useMutation(
    removeConstellationDiscourseme,
  )
  const isMutating = useIsMutating(removeConstellationDiscourseme) > 0

  return (
    <li
      key={discourseme.id}
      className={cn(
        'border-input ring-ring flex gap-x-4 rounded-md border py-0 pl-4 pr-1 ring-offset-2 transition-all focus-within:ring-2',
        !isEditable && 'border-transparent py-0 pl-0',
      )}
    >
      <Small className="mx-0 my-auto flex flex-grow leading-none">
        {discourseme.name}
        <span className="text-muted-foreground mt-1 block">
          {discourseme.comment}
        </span>
      </Small>
      <Button
        disabled={isMutating || !isEditable}
        onClick={() =>
          removeConstellationFromDiscourseme({ discoursemeId, constellationId })
        }
        variant="ghost"
        type="button"
        size="icon"
        className={cn(
          'm-1 h-8 w-8 flex-shrink-0 self-center p-1 transition-all focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent',
          !isEditable && 'h-0 w-0 disabled:opacity-0',
        )}
      >
        {isMutating ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <XIcon className="h-4 w-4" />
        )}
      </Button>
      <ErrorMessage error={error} />
    </li>
  )
}

function DescriptionAssociation({
  className,
  constellationId,
  descriptionId,
}: {
  className?: string
  constellationId: number | undefined
  descriptionId: number
}) {
  const { data, isLoading, error } = useQuery({
    ...constellationDescriptionAssociations(constellationId!, descriptionId!),
    enabled: constellationId !== undefined,
    select: (data) => {
      // The two arrays `scores` and `scaled_scores` are parallel arrays
      data.scores = data.scores.map((score, index) => ({
        ...score,
        // Normalize the scaled score to be between 0 and 1; that's what the visualization expects
        scaledScore: (data.scaled_scores[index].score ?? 0) / 2 + 0.5,
      }))
      return data
    },
  })
  const { data: discoursemes, error: errorDiscoursemes } =
    useQuery(discoursemesList)

  if (isLoading || !data || discoursemes === undefined) {
    return <Loader2Icon className="mx-auto my-5 animate-spin" />
  }
  if (error || errorDiscoursemes) {
    return (
      <>
        <ErrorMessage error={error} />
        <ErrorMessage error={errorDiscoursemes} />
      </>
    )
  }

  const legendNameMap = discoursemes.reduce((acc, { id, name }) => {
    acc.set(id, name ?? 'No Name Available')
    return acc
  }, new Map<number, string>())

  return (
    <AssociationMatrix
      className={className}
      legendNameMap={legendNameMap}
      associations={data.scores}
    />
  )
}
