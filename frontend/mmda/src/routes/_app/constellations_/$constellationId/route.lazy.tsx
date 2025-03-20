import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  createLazyFileRoute,
  Link,
  useRouterState,
} from '@tanstack/react-router'
import { Loader2Icon, MapIcon } from 'lucide-react'

import { Card } from '@cads/shared/components/ui/card'
import { Headline3, Muted } from '@cads/shared/components/ui/typography'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { Label } from '@cads/shared/components/ui/label'
import { AssociationMatrix } from '@cads/shared/components/association-matrix'
import {
  constellationById,
  discoursemesList,
  constellationDescriptionAssociations,
} from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils.ts'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'
import { SemanticMap } from './-semantic-map'
import { useDescription } from './-use-description'
import { SemanticMapPreview } from './-semantic-map-preview'
import { useFilterSelection } from './-use-filter-selection'
import { DiscoursemeList } from './-discourseme-list'

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
  const { data: discoursemes = [] } = useQuery(discoursemesList)

  const constellationIds = (description?.discourseme_descriptions ?? []).map(
    (d) => d.discourseme_id,
  )
  const discoursemesInDescription = discoursemes.filter((d) =>
    constellationIds.includes(d.id),
  )

  const isMapAvailable =
    corpusId !== undefined && focusDiscourseme !== undefined

  return (
    <AppPageFrameSemanticMap
      title="Constellation"
      showsSemanticMap={showsSemanticMap}
      mapContent={
        <SemanticMap constellationId={constellationId}>
          <ConstellationCollocationFilter
            className="grow rounded-xl p-2 shadow"
            hideSortOrder
          />
        </SemanticMap>
      }
      drawerContent={
        corpusId === undefined ? (
          <p className="text-muted-foreground flex h-52 w-full items-center justify-center text-center">
            No data available.
            <br />
            Select a corpus.
          </p>
        ) : (
          <ConstellationConcordanceLines
            corpusId={corpusId}
            constellationId={constellationId}
          />
        )
      }
      isDrawerVisible={isConcordanceVisible}
      onDrawerToggle={(isVisible) =>
        setFilter('isConcordanceVisible', isVisible)
      }
    >
      <ErrorMessage error={errorDescription} />

      <Headline3 className="border-0">{name}</Headline3>

      {comment && <Muted>{comment}</Muted>}

      <div className="mt-4 grid grid-cols-[3fr_1fr] gap-5">
        <DiscoursemeList
          constellationId={constellationId}
          descriptionId={description?.id as number}
          discoursemes={discoursemes}
          constellationDiscoursemes={constellationDiscoursemes}
        />

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
          Corpus or Subcorpus
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

      {description?.id !== undefined &&
        constellationDiscoursemes.length > 1 && (
          <Card className="my-4">
            <DescriptionAssociation
              constellationId={constellationId}
              descriptionId={description.id}
            />
          </Card>
        )}

      <ConstellationCollocationFilter className="sticky top-14 mb-8" />

      <Collocation
        constellationId={constellationId}
        descriptionId={description?.id}
      />
    </AppPageFrameSemanticMap>
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
