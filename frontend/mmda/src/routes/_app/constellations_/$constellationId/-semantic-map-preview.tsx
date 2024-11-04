import { cn } from '@cads/shared/lib/utils'
import { useCollocation } from './-use-collocation'
import { useDescription } from './-use-description'
import { Route } from './route.lazy'
import { useMemo } from 'react'

export function SemanticMapPreview({ className }: { className?: string }) {
  // TODO: It shouldn't be necessary to use three hooks here; simplify/unify some of them
  const constellationId = parseInt(Route.useParams().constellationId)
  const { description } = useDescription()
  const { collocationItemsMap } = useCollocation(
    constellationId,
    description?.id,
  )

  const coordinates = useMemo(() => {
    if (!collocationItemsMap) return []
    const { items, coordinates } = collocationItemsMap
    return items
      .map(({ item }) => {
        const coords = coordinates.find(
          (coordinates) => coordinates.item === item,
        )
        return {
          item: item,
          x: coords?.x_user ?? coords?.x ?? 0,
          y: coords?.y_user ?? coords?.y ?? 0,
        }
      })
      .filter(({ item }) => Boolean(item))
  }, [collocationItemsMap])

  return (
    <svg
      className={cn('', className)}
      viewBox="-100 -100 200 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {coordinates.map(({ x, y, item }) => (
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
