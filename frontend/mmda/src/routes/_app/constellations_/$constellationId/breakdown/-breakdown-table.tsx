import { queryOptions, useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'

import { constellationDescriptionBreakdown } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeBreakdown } from '@/components/discourseme-breakdown'
import { Card } from '@cads/shared/components/ui/card'

import { useDescription } from '../-use-description'
import { useBreakdownSelection } from './-use-breakdown-selection'
import { Route } from './route'

export function BreakdownTable() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { analysisLayer, errors } = useBreakdownSelection()

  const { description } = useDescription()
  const descriptionId = description?.id

  const {
    data,
    isLoading,
    error: breakdownError,
  } = useQuery(
    queryOptions({
      ...constellationDescriptionBreakdown(
        constellationId,
        descriptionId!,
        analysisLayer!,
      ),
      enabled: descriptionId !== undefined && analysisLayer !== undefined,
    }),
  )

  return (
    <Card className="mb-8">
      <ErrorMessage error={breakdownError} />
      <ErrorMessage error={errors} />

      {isLoading && <Loader2Icon className="mx-auto my-5 animate-spin" />}

      {data && <DiscoursemeBreakdown breakdown={data} />}
    </Card>
  )
}
