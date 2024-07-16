import { useMemo, useState } from 'react'
import {
  useMutation,
  useSuspenseQuery,
  useIsMutating,
  useQuery,
} from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import { Loader2, Pencil, PencilOff, X } from 'lucide-react'
import { z } from 'zod'

import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@/components/ui/card'
import { Headline3, Muted, Small } from '@/components/ui/typography'
import { CorpusSelect } from '@/components/select-corpus'
import { Button } from '@/components/ui/button'
import {
  addConstellationDiscoursemeMutationOptions,
  constellationQueryOptions,
  corporaQueryOptions,
  deleteConstellationDiscoursemeMutationOptions,
  discoursemesQueryOptions,
} from '@/lib/queries'
import { ErrorMessage } from '@/components/error-message'
import { schemas } from '@/rest-client'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'
import { cn } from '@/lib/utils'
import { DiscoursemeSelect } from '@/components/select-discourseme'

export const Route = createLazyFileRoute(
  '/_app/constellations/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  const { constellationId } = Route.useParams()
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
  const [corpusId, setCorpusId] = useState<number | undefined>(undefined)
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
    <AppPageFrame title="Constellation">
      <Headline3 className="border-0">{name}</Headline3>
      {description && <Muted>{description}</Muted>}
      <Card className="mt-4 grid max-w-2xl grid-cols-2 gap-x-4 gap-y-0 p-4">
        <div>
          <div className="mb-2 font-bold">Filter Discoursemes</div>
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
          <div className="mb-2 flex justify-between font-bold">
            Highlight Discoursemes
            <Button
              variant="ghost"
              onClick={() => setIsEditMode(!isEditMode)}
              className="m-0 h-6 w-6 p-0"
            >
              {!isEditMode ? <Pencil size={16} /> : <PencilOff size={16} />}
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
      <>
        <CorpusSelect
          className="mt-4"
          corpora={corpora}
          onChange={setCorpusId}
          corpusId={corpusId}
        />
        {corpusId !== undefined && (
          <ConstellationConcordanceLines
            corpusId={corpusId}
            constellationId={constellationId}
          />
        )}
      </>
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
          {discourseme.description}
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
