import { queryOptions, useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'

import { constellationDescriptionBreakdown } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeBreakdown } from '@/components/discourseme-breakdown'
import { Card } from '@cads/shared/components/ui/card'

import { useAnalysisSelection } from './-use-analysis-selection'
import { useDescription } from './-use-description'

export function Breakdown() {
  const { analysisSelection } = useAnalysisSelection()
  if (analysisSelection?.analysisType !== 'breakdown')
    throw new Error('Breakdown analysis type not selected')

  const { constellationId, description } = useDescription()
  const descriptionId = description?.id

  const { data, isLoading, error } = useQuery(
    queryOptions({
      ...constellationDescriptionBreakdown(
        constellationId,
        descriptionId!,
        analysisSelection.analysisLayer,
      ),
      enabled: constellationId !== undefined && descriptionId !== undefined,
    }),
  )

  return (
    <Card>
      <ErrorMessage error={error} />
      {isLoading && <Loader2Icon className="mx-auto my-5 animate-spin" />}
      {data && <DiscoursemeBreakdown breakdown={data} />}
    </Card>
  )
}
