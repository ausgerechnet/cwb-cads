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
  Outlet,
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
import { Card } from '@/components/ui/card'
import { Headline3, Muted, Small } from '@/components/ui/typography'
import { CorpusSelect } from '@/components/select-corpus'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { Drawer } from '@/components/drawer'
import { Label } from '@/components/ui/label'
import {
  addConstellationDiscourseme,
  constellationById,
  constellationDescriptionFor,
  corpusList,
  deleteConstellationDiscourseme,
  discoursemesList,
} from '@/lib/queries.ts'
import { cn } from '@/lib/utils.ts'
import { schemas } from '@/rest-client'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'

export const Route = createLazyFileRoute(
  '/_app/constellations/$constellationId',
)({
  component: ConstellationDetail,
})

function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { corpusId } = Route.useSearch()
  const { secondary, s } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const {
    data: description,
    isLoading: isLoadingDescription,
    error: errorDescription,
  } = useQuery({
    ...constellationDescriptionFor({
      constellationId,
      corpusId: corpusId!,
      subcorpusId: undefined,
      p: secondary,
      s,
      matchStrategy: 'longest',
    }),
    enabled:
      corpusId !== undefined && secondary !== undefined && s !== undefined,
  })
  return { description, isLoadingDescription, errorDescription }
}

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
    corpusId,
    isConcordanceVisible = true,
    focusDiscourseme,
  } = Route.useSearch()

  const { setFilter } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )

  // TODO: combine these two
  const setSelection = (
    key: 'corpusId' | 'focusDiscourseme',
    value: number | undefined,
  ) =>
    navigate({
      to: '/constellations/$constellationId',
      params: { constellationId: constellationId.toString() },
      search: (s) => ({ ...s, [key]: value }),
      replace: true,
    })

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
  const { data: corpora } = useSuspenseQuery(corpusList)

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
      classNameContainer="pb-0 flex-grow"
      classNameContent="pb-0"
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
            >
              <Card className="mx-0 flex h-48 w-full place-items-center bg-muted p-4 text-center text-muted-foreground">
                <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
                Semantic Map preview
              </Card>
            </Link>
          </div>
          <CorpusSelect
            className="mt-4"
            corpora={corpora}
            onChange={(corpusId) => setSelection('corpusId', corpusId)}
            corpusId={corpusId}
          />
          <Label>
            Focus Discourseme:
            <div className="relative">
              <DiscoursemeSelect
                discoursemes={discoursemesInDescription}
                discoursemeId={focusDiscourseme}
                onChange={(discoursemeId) => {
                  void setFilter('ccPageNumber', 1)
                  void setSelection('focusDiscourseme', discoursemeId)
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
          <ConstellationFilter className="sticky top-14 bg-background" />
          <Outlet />
          {focusDiscourseme !== undefined && !showsSemanticMap && (
            <Collocation
              constellationId={constellationId}
              descriptionId={description?.id}
              corpusId={corpusId}
            />
          )}
          <Drawer
            className="z-10"
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
  const discoursemeId = discourseme.id! // TODO: Fix this non-null assertion
  const { mutate, error } = useMutation(deleteConstellationDiscourseme)
  const isMutating = useIsMutating(deleteConstellationDiscourseme) > 0

  return (
    <li
      key={discourseme.id}
      className={cn(
        'flex gap-x-4 rounded-md border border-input py-2 pl-4 pr-1 ring-ring ring-offset-2 transition-all focus-within:ring-2',
        !isEditable && 'border-transparent py-0 pl-0',
      )}
    >
      <Small className="mx-0 my-auto flex-grow">
        {discourseme.name}
        <span className="mt-1 block text-muted-foreground">
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
