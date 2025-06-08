import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLazyFileRoute, Outlet } from '@tanstack/react-router'

import { ConcordanceFilterProvider } from '@cads/shared/components/concordances'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { corpusById } from '@cads/shared/queries'

export const Route = createLazyFileRoute(
  '/_app/constellations_/$constellationId',
)({
  component: ConstellationDetail,
})

function ConstellationDetail() {
  const searchParams = Route.useSearch()
  const { corpusId, subcorpusId } = Route.useSearch()
  // const constellationId = parseInt(Route.useParams().constellationId)

  const { data: corpus, error: corpusError } = useQuery({
    ...corpusById(corpusId!, subcorpusId),
    enabled: corpusId !== undefined,
  })
  const [layers, structureAttributes] = useMemo(
    () => [corpus?.p_atts ?? [], corpus?.s_atts ?? []],
    [corpus],
  )

  return (
    <ConcordanceFilterProvider
      params={searchParams}
      layers={layers}
      structureAttributes={structureAttributes}
    >
      <ErrorMessage error={corpusError} />

      <Outlet />
    </ConcordanceFilterProvider>
  )
}
