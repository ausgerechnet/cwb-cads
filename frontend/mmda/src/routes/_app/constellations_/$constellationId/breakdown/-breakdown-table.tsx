import { queryOptions, useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'

import { constellationDescriptionBreakdown } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeBreakdown } from '@/components/discourseme-breakdown'
import { Card } from '@cads/shared/components/ui/card'

import { useDescription } from '../-use-description'
import { useBreakdownSelection } from './-use-breakdown-selection'

export function BreakdownTable() {
  const { analysisLayer } = useBreakdownSelection()

  const { constellationId, description } = useDescription()
  const descriptionId = description?.id

  const { data, isLoading, error } = useQuery(
    queryOptions({
      ...constellationDescriptionBreakdown(
        constellationId,
        descriptionId!,
        analysisLayer!,
      ),
      enabled:
        constellationId !== undefined &&
        descriptionId !== undefined &&
        analysisLayer !== undefined,
    }),
  )

  return (
    <Card className="mb-8">
      <ErrorMessage error={error} />

      {isLoading && <Loader2Icon className="mx-auto my-5 animate-spin" />}

      {data && <DiscoursemeBreakdown breakdown={data} />}
    </Card>
  )
}
