import { useQuery } from '@tanstack/react-query'

import { cn } from '@cads/shared/lib/utils'
import {
  constellationDescriptionCollection,
  constellationDescriptionCollectionCollocation,
} from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { useConcordanceFilterContext } from '@cads/shared/components/concordances'

import { useAnalysisSelection } from './-use-analysis-selection'
import { Route } from './route'

function useUfa() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const { analysisSelection } = useAnalysisSelection()
  const { clContextBreak, windowSize } = useConcordanceFilterContext()

  if (analysisSelection?.analysisType !== 'ufa') {
    throw new Error('Invalid analysis type')
  }

  const { data: collection, error: errorCollection } = useQuery(
    constellationDescriptionCollection(
      constellationId,
      analysisSelection.analysisLayer,
      analysisSelection.partition,
    ),
  )
  const collectionId = collection?.id

  const filterDiscoursemeIds: number[] = []

  const { data: collectionDescriptions, error: errorCollectionDescriptions } =
    useQuery({
      ...constellationDescriptionCollectionCollocation(
        constellationId,
        collectionId!,
        {
          filterDiscoursemeIds,
          filterItem: undefined,
          filterItemPAtt: undefined,
          focusDiscoursemeId: analysisSelection.focusDiscourseme,
          p: analysisSelection.analysisLayer,
          sBreak: clContextBreak!,
          window: windowSize,
        },
      ),
      enabled:
        collectionId !== undefined &&
        clContextBreak !== undefined &&
        collectionId !== undefined,
    })

  return {
    errors: [errorCollection, errorCollectionDescriptions],
    collectionDescriptions,
  }
}

export function UfaSelection({ className }: { className?: string }) {
  const { errors } = useUfa()
  return (
    <div>
      <ErrorMessage error={errors} />
      <div className={cn('flex flex-col gap-2', className)}>Here</div>
    </div>
  )
}
