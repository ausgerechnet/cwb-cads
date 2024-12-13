import { cn } from '@cads/shared/lib/utils'
import { useCollocation } from './-use-collocation'
import { useDescription } from './-use-description'
import { Route } from './route.lazy'

export function SemanticMapPreview({ className }: { className?: string }) {
  // TODO: It shouldn't be necessary to use three hooks here; simplify/unify some of them
  const constellationId = parseInt(Route.useParams().constellationId)
  const { description } = useDescription()
  const { mapItems } = useCollocation(constellationId, description?.id)

  return (
    <svg
      className={cn('', className)}
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {(mapItems?.map ?? []).map(({ x, y, item }) => (
        <circle
          cx={x * 100}
          cy={y * 100}
          r={2}
          key={item}
          className="fill-muted-foreground"
          opacity={0.2}
        />
      ))}
    </svg>
  )
}
