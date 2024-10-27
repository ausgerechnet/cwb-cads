import { useMemo, useState } from 'react'
import {
  useMutation,
  useSuspenseQuery,
  useIsMutating,
  useQuery,
} from '@tanstack/react-query'
import {
  createLazyFileRoute,
  Link,
  useNavigate,
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

import { useFilterSelection } from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@cads/shared/components/ui/card'
import { Headline3, Muted, Small } from '@cads/shared/components/ui/typography'
import { Button } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { Drawer } from '@/components/drawer'
import { Label } from '@cads/shared/components/ui/label'
import {
  addConstellationDiscourseme,
  constellationById,
  removeConstellationDiscourseme,
  discoursemesList,
} from '@/lib/queries.ts'
import { cn } from '@/lib/utils.ts'
import { schemas } from '@/rest-client'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationCollocationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'
import { SemanticMap } from './-semantic-map'
import { useDescription } from './-use-description'
import { SelectSubcorpus } from '@/components/select-subcorpus'

export const Route = createLazyFileRoute(
  '/_app/constellations/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  // TODO: update @tanstack/react-router to use `useMatch` with 'shouldThrow: false'
  const showsSemanticMap =
    useRouterState().matches.find(
      (match) =>
        match.routeId === '/_app/constellations/$constellationId/semantic-map',
    ) !== undefined
  const navigate = useNavigate()
  const constellationId = parseInt(Route.useParams().constellationId)

  const {
    setFilter,
    corpusId,
    subcorpusId,
    isConcordanceVisible,
    focusDiscourseme,
  } = useFilterSelection('/_app/constellations/$constellationId')

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

  const nonSelectedDiscoursemes = useMemo(
    () =>
      discoursemes.filter(
        (discourseme) =>
          !constellationDiscoursemes?.find(({ id }) => id === discourseme.id),
      ),
    [discoursemes, constellationDiscoursemes],
  )

  const discoursemesInDescription = useMemo(() => {
    const constellationIds = (description?.discourseme_descriptions ?? []).map(
      (d) => d.discourseme_id,
    )
    return discoursemes.filter((d) => constellationIds.includes(d.id))
  }, [description?.discourseme_descriptions, discoursemes])

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
          <div className="mt-4 grid grid-cols-[2fr_1fr] gap-5">
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
                  className="mt-1"
                  discoursemes={nonSelectedDiscoursemes}
                  disabled={isPending}
                  onChange={(discoursemeId) =>
                    addDiscourseme({
                      discoursemeId: discoursemeId as number,
                      constellationId,
                    })
                  }
                />
              )}
              <ErrorMessage error={errorAddDiscourseme} className="mt-2" />
            </Card>
            <Link
              to="/constellations/$constellationId/semantic-map"
              from="/constellations/$constellationId"
              params={{ constellationId: constellationId.toString() }}
              search={(s) => s}
              disabled={
                corpusId === undefined || focusDiscourseme === undefined
              }
            >
              <Card className="bg-muted text-muted-foreground mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 p-4 text-center">
                <div className="flex gap-3">
                  <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                  <span>Semantic Map</span>
                </div>
                {(corpusId === undefined || focusDiscourseme === undefined) && (
                  <div className="flex flex-col gap-1 rounded bg-amber-200 p-2 text-amber-800">
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
          <SelectSubcorpus
            className="mt-4"
            onChange={(corpusId, subcorpusId) => {
              void setFilter('corpusId', corpusId)
              void setFilter('subcorpusId', subcorpusId)
            }}
            corpusId={corpusId}
            subcorpusId={subcorpusId}
          />
          <Label>
            Focus Discourseme:
            <div className="relative">
              <DiscoursemeSelect
                discoursemes={discoursemesInDescription}
                discoursemeId={focusDiscourseme}
                onChange={(discoursemeId) => {
                  void setFilter('ccPageNumber', 1)
                  void setFilter('focusDiscourseme', discoursemeId)
                }}
                disabled={isLoadingDescription}
                className="w-full"
              />
              {isLoadingDescription && (
                <Loader2Icon className="absolute left-1/2 top-2 animate-spin" />
              )}
            </div>
          </Label>
        </>
      )}
      {corpusId !== undefined && (
        <>
          <ConstellationCollocationFilter
            className={cn(
              'bg-background sticky top-14',
              showsSemanticMap &&
                'absolute left-10 right-5 top-10 rounded-xl p-2 shadow',
            )}
          />
          {showsSemanticMap && (
            <SemanticMap constellationId={constellationId} />
          )}
          {focusDiscourseme !== undefined && !showsSemanticMap && (
            <Collocation
              constellationId={constellationId}
              descriptionId={description?.id}
            />
          )}
          <Drawer
            className={cn(
              'z-10',
              showsSemanticMap && 'absolute left-0 right-0 w-full',
            )}
            isVisible={isConcordanceVisible}
            onToggle={(isVisible) =>
              navigate({
                params: (p) => p,
                search: (s) => ({
                  ...s,
                  isConcordanceVisible: isVisible,
                }),
                replace: true,
              })
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
  const { mutate, error } = useMutation(removeConstellationDiscourseme)
  const isMutating = useIsMutating(removeConstellationDiscourseme) > 0

  return (
    <li
      key={discourseme.id}
      className={cn(
        'border-input ring-ring flex gap-x-4 rounded-md border py-2 pl-4 pr-1 ring-offset-2 transition-all focus-within:ring-2',
        !isEditable && 'border-transparent py-0 pl-0',
      )}
    >
      <Small className="mx-0 my-auto flex-grow">
        {discourseme.name}
        <span className="text-muted-foreground mt-1 block">
          {discourseme.comment}
        </span>
      </Small>
      <Button
        disabled={isMutating || !isEditable}
        onClick={() => mutate({ discoursemeId, constellationId })}
        variant="ghost"
        type="button"
        size="icon"
        className={cn(
          'min-h-min min-w-min flex-shrink-0 self-center p-2 transition-all focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent',
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
