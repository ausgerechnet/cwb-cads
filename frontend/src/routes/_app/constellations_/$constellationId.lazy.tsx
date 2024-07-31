import { useMemo, useState } from 'react'
import {
  useMutation,
  useSuspenseQuery,
  useIsMutating,
  useQuery,
} from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChevronDownIcon,
  ChevronUpIcon,
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
import { Headline3, Muted, Small } from '@/components/ui/typography'
import { CorpusSelect } from '@/components/select-corpus'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import {
  addConstellationDiscoursemeMutationOptions,
  constellationQueryOptions,
  corporaQueryOptions,
  deleteConstellationDiscoursemeMutationOptions,
  discoursemesQueryOptions,
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
    data: {
      description,
      name,
      filter_discoursemes: filterDiscoursemes = [],
      highlight_discoursemes: highlightDiscoursemes = [],
    },
  } = useSuspenseQuery(constellationQueryOptions(constellationId))
  const { mutate: addDiscourseme, isPending } = useMutation(
    addConstellationDiscoursemeMutationOptions,
  )
  const { data: discoursemes = [] } = useQuery(discoursemesQueryOptions)
  const { data: corpora } = useSuspenseQuery(corporaQueryOptions)
  const [isEditMode, setIsEditMode] = useState(false)
  const nonSelectedDiscoursemes = useMemo(
    () =>
      discoursemes.filter(
        (discourseme) =>
          !filterDiscoursemes.find(({ id }) => id === discourseme.id) &&
          !highlightDiscoursemes.find(({ id }) => id === discourseme.id),
      ),
    [discoursemes, filterDiscoursemes, highlightDiscoursemes],
  )

  return (
    <AppPageFrame
      title="Constellation"
      classNameContainer="pb-0 flex-grow"
      classNameContent="pb-0"
    >
      <Headline3 className="border-0">{name}</Headline3>
      {description && <Muted>{description}</Muted>}
      <div className="mt-4 grid grid-cols-[3fr_1fr] gap-5">
        <Card className="mx-0 grid w-full grid-cols-2 gap-x-4 gap-y-0 p-4">
          <div>
            <div className="mb-2 flex place-items-center font-bold">
              <Filter className="mr-2 h-4 w-4" />
              Filter Discoursemes
            </div>
            <ul className="flex flex-col gap-1">
              {filterDiscoursemes.map((discourseme) => (
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
            <ul className="flex flex-col gap-1">
              {highlightDiscoursemes.map((discourseme) => (
                <DiscoursemeItem
                  key={discourseme.id}
                  discourseme={discourseme}
                  constellationId={parseInt(constellationId)}
                  isEditable={isEditMode}
                />
              ))}
            </ul>
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
          <div className="sticky bottom-0 right-0 -mx-2 mt-auto min-h-10 border border-b-0 border-l-0 border-r-0 border-t-muted bg-background p-4 [box-shadow:0_-5px_10px_-10px_black]">
            <Button
              variant="outline"
              className="absolute -top-3 left-1/2 h-auto -translate-x-1/2 rounded-full p-1"
              onClick={() => {
                navigate({
                  to: '/constellations/$constellationId',
                  params: { constellationId },
                  search: (s) => ({
                    ...s,
                    isConcordanceVisible: !isConcordanceVisible,
                  }),
                  replace: true,
                })
              }}
            >
              {isConcordanceVisible ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </Button>
            <div
              className={cn(
                'grid transition-all',
                isConcordanceVisible
                  ? 'grid-rows-[1fr]'
                  : 'grid-rows-[0fr] opacity-20',
              )}
            >
              <div className="overflow-hidden">
                <ConstellationConcordanceLines
                  corpusId={corpusId}
                  constellationId={constellationId}
                />
              </div>
            </div>
          </div>
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
  const { mutate, error } = useMutation(
    deleteConstellationDiscoursemeMutationOptions,
  )
  const isMutating =
    useIsMutating(deleteConstellationDiscoursemeMutationOptions) > 0

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
