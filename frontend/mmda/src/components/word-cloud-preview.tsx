import { useEffect } from 'react'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { cn } from '@cads/shared/lib/utils'

type Item = {
  x: number
  y: number
  item: string
  discourseme_id?: number | null
  source?: string
}

const emptyArray: Item[] = [] as const

export function WordCloudPreview({
  items = emptyArray,
  className,
}: {
  items?: Item[]
  className?: string
}) {
  const filteredItems = items.filter((item, index, allItems) => {
    for (let i = 0; i < index; i++) {
      if (item.item === allItems[i].item) {
        return false
      }
    }
    return true
  })

  useEffect(() => {
    if (filteredItems.length === items.length) return
    console.warn(
      'WordCloudPreview: Duplicate items found and removed. There is likely either a bug in the API or the processing of the data:',
      items.filter(
        (item, index, allItems) =>
          allItems.findIndex((i) => i.item === item.item) !== index,
      ),
    )
  }, [filteredItems, items])

  return (
    <svg
      className={cn('aspect-[2/1]', className)}
      viewBox="-200 -100 400 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {(filteredItems ?? []).map(({ x, y, item, discourseme_id, source }) => {
        const isDiscourseme = source === 'discoursemes'
        return (
          <circle
            cx={x * 200}
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
