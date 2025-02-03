import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { useCollocation } from './-use-collocation'
import { useDescription } from './-use-description'
import { Route } from './route.lazy'
import { cn } from '@cads/shared/lib/utils'

export function SemanticMapPreview({ className }: { className?: string }) {
  // TODO: It shouldn't be necessary to use three hooks here; simplify/unify some of them
  const constellationId = parseInt(Route.useParams().constellationId)
  const { description } = useDescription()
  const { mapItems } = useCollocation(constellationId, description?.id)

  return (
    <svg
      className={className}
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {(mapItems?.map ?? []).map(({ x, y, item, discourseme_id, source }) => {
        const isDiscourseme = source === 'discoursemes'
        return (
          <circle
            cx={x * 100}
            cy={y * 100}
            r={isDiscourseme ? 4 : 2}
            key={`${item}_${discourseme_id}`}
            className={cn(!isDiscourseme && 'fill-muted-foreground')}
            opacity={isDiscourseme ? 0.6 : 0.2}
            fill={
              isDiscourseme ? getColorForNumber(discourseme_id ?? 0) : undefined
            }
          />
        )
      })}
    </svg>
  )
}
