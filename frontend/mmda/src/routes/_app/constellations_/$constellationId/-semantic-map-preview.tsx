import { useCollocation } from './-use-collocation'
import { useDescription } from './-use-description'
import { Route } from './route.lazy'
import { WordCloudPreview } from '@/components/word-cloud-preview'

export function SemanticMapPreview({ className }: { className?: string }) {
  // TODO: It shouldn't be necessary to use three hooks here; simplify/unify some of them
  const constellationId = parseInt(Route.useParams().constellationId)
  const { description } = useDescription()
  const { mapItems } = useCollocation(constellationId, description?.id)

  return <WordCloudPreview items={mapItems?.map} className={className} />
}
