import { useQuery } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'

import {
  constellationDescriptionAssociations,
  discoursemesList,
} from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { AssociationMatrix } from '@cads/shared/components/association-matrix'

import { useDescription } from '../-use-description'
import { Route } from './route'

export function DescriptionAssociations({ className }: { className?: string }) {
  const constellationId = parseInt(Route.useParams().constellationId)

  const { description } = useDescription()
  const descriptionId = description?.id

  const { data, isLoading, error } = useQuery({
    ...constellationDescriptionAssociations(constellationId!, descriptionId!),
    enabled: constellationId !== undefined,
    select: (data) => {
      // The two arrays `scores` and `scaled_scores` are parallel arrays
      data.scores = data.scores.map((score, index) => ({
        ...score,
        // Normalize the scaled score to be between 0 and 1; that's what the visualization expects
        scaledScore: (data.scaled_scores[index].score ?? 0) / 2 + 0.5,
      }))
      return data
    },
  })
  const { data: discoursemes, error: errorDiscoursemes } =
    useQuery(discoursemesList)

  const legendNameMap = discoursemes?.reduce((acc, { id, name }) => {
    acc.set(id, name ?? 'No Name Available')
    return acc
  }, new Map<number, string>())

  if (isLoading || !data || discoursemes === undefined) {
    return <Loader2Icon className="mx-auto my-5 animate-spin" />
  }

  if (error || errorDiscoursemes) {
    return <ErrorMessage error={[error, errorDiscoursemes]} />
  }

  return (
    <AssociationMatrix
      className={className}
      legendNameMap={legendNameMap}
      associations={data.scores}
    />
  )
}
