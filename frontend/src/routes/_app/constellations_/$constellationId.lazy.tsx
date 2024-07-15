import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'

import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@/components/ui/card'
import { Headline3, Muted } from '@/components/ui/typography'
import { CorpusSelect } from '@/components/select-corpus'
import { constellationQueryOptions, corporaQueryOptions } from '@/lib/queries'
import { ConstellationConcordanceLines } from './-constellation-concordance-lines'

export const Route = createLazyFileRoute(
  '/_app/constellations/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  const { constellationId } = Route.useParams()
  const { data } = useSuspenseQuery(constellationQueryOptions(constellationId))
  const { data: corpora } = useSuspenseQuery(corporaQueryOptions)
  const [corpusId, setCorpusId] = useState<number | undefined>(undefined)
  const {
    description,
    name,
    filter_discoursemes = [],
    highlight_discoursemes = [],
  } = data
  return (
    <AppPageFrame title="Constellation">
      <Headline3 className="border-0">{name}</Headline3>
      {description && <Muted>{description}</Muted>}
      <Card className="mt-4 grid max-w-2xl grid-cols-2 p-4">
        <div>
          <span className="font-bold">Filter Discoursemes:</span>
          <ul>
            {filter_discoursemes.map((discourseme) => (
              <li>
                {discourseme.name}
                {discourseme.description}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-bold">Highlight Discoursemes:</span>
          <ul>
            {highlight_discoursemes.map((discourseme) => (
              <li>
                {discourseme.name}
                {discourseme.description}
              </li>
            ))}
          </ul>
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
