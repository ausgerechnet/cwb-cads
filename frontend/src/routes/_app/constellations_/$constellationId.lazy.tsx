import { useMemo, useState } from 'react'
import {
  useMutation,
  useSuspenseQuery,
  useIsMutating,
  useQuery,
} from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Filter,
  Highlighter,
  Loader2,
  MapIcon,
  Pencil,
  PencilOff,
  X,
} from 'lucide-react'
import { z } from 'zod'

import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@/components/ui/card'
import { Headline3, Large, Muted, Small } from '@/components/ui/typography'
import { CorpusSelect } from '@/components/select-corpus'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { Drawer } from '@/components/drawer'
import {
  addConstellationDiscourseme,
  constellationById,
  corpusList,
  deleteConstellationDiscourseme,
  discoursemesList,
} from '@/lib/queries'
import { cn } from '@/lib/utils'
import { schemas } from '@/rest-client'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { ConstellationFilter } from './-constellation-filter'
import { Collocation } from './-constellation-collocation'

export const Route = createLazyFileRoute(
  '/_app/constellations/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  const navigate = useNavigate()
  const { constellationId } = Route.useParams()
  const { corpusId, isConcordanceVisible = true } = Route.useSearch()
  const setCorpusId = (corpusId: number | undefined) =>
    navigate({
      to: '/constellations/$constellationId',
      params: { constellationId },
      search: (s) => ({ ...s, corpusId }),
      replace: true,
    })
  const {
    data: { comment, name, discoursemes: constellationDiscoursemes = [] },
  } = useSuspenseQuery(constellationById(constellationId))
  const { mutate: addDiscourseme, isPending } = useMutation(
    addConstellationDiscourseme,
  )
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

  return (
    <AppPageFrame
      title="Constellation"
      classNameContainer="pb-0 flex-grow"
      classNameContent="pb-0"
    >
      <Headline3 className="border-0">{name}</Headline3>
      <Large>
        StrongStrong TODO: check if this is still okay, API was changed. only
        one discourseme array.
      </Large>
      {comment && <Muted>{comment}</Muted>}
      <div className="mt-4 grid grid-cols-[3fr_1fr] gap-5">
        <Card className="mx-0 grid w-full grid-cols-2 gap-x-4 gap-y-0 p-4">
          <div>
            <div className="mb-2 flex place-items-center font-bold">
              <Filter className="mr-2 h-4 w-4" />
              Discoursemes
            </div>
            <ul className="flex flex-col gap-1">
              {constellationDiscoursemes.map((discourseme) => (
                <DiscoursemeItem
                  key={discourseme.id}
                  discourseme={discourseme}
                  constellationId={parseInt(constellationId)}
                  isEditable={false}
                />
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 flex place-items-center font-bold">
              <Highlighter className="mr-2 h-4 w-4" /> Highlight Discoursemes
              <Button
                variant="outline"
                onClick={() => setIsEditMode(!isEditMode)}
                className="m-0 ml-auto flex h-6 gap-1 p-0 pl-1 pr-2"
              >
                {!isEditMode ? <Pencil size={16} /> : <PencilOff size={16} />}
                Edit
              </Button>
            </div>
            {isEditMode && (
              <DiscoursemeSelect
                className="mt-1"
                discoursemes={nonSelectedDiscoursemes}
                disabled={isPending}
                onChange={(discoursemeId) =>
                  addDiscourseme({
                    discoursemeId: discoursemeId as number,
                    constellationId: parseInt(constellationId),
                  })
                }
              />
            )}
          </div>
        </Card>
        <Card className="mx-0 flex h-48 w-full place-items-center bg-gray-200 p-4 text-center">
          <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
          Semantic Map preview and link will go here
        </Card>
      </div>
      <CorpusSelect
        className="mt-4"
        corpora={corpora}
        onChange={setCorpusId}
        corpusId={corpusId}
      />
      {corpusId !== undefined && (
        <>
          <ConstellationFilter className="sticky top-14 bg-background" />
          <Collocation constellationId={parseInt(constellationId)} />
          <Drawer
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
  const discoursemeId = discourseme.id as number // TODO: Fix this type cast
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
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </Button>
      <ErrorMessage error={error} />
    </li>
  )
}
