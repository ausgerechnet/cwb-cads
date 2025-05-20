import { z } from 'zod'
import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'

import { schemas } from '../api-client'
import { getColorForNumber } from '../lib/get-color-for-number'
import { formatNumber } from '../lib/format-number'
import { DataTable, SortButton } from './data-table'
import { DiscoursemeName } from './discourseme-name'

type Item = {
  type: 'discourseme' | 'item'
  name: string
  score: number
  sortValue?: [number, number]
  discoursemeId: number
}

export function DiscoursemeBreakdown({
  discoursemeScores,
}: {
  discoursemeScores: z.infer<typeof schemas.DiscoursemeScoresOut>[]
}) {
  const rows = useMemo(
    (): Item[] =>
      discoursemeScores
        .toSorted((a, b) => {
          const scoreA =
            a.global_scores?.find((gs) => gs.measure === 'ipm')?.score ?? 0
          const scoreB =
            b.global_scores?.find((gs) => gs.measure === 'ipm')?.score ?? 0
          return scoreB - scoreA
        })
        .map(({ item_scores, global_scores = [], discourseme_id }): Item[] => {
          const discoursemeScore =
            global_scores.find((gs) => gs.measure === 'ipm')?.score ?? 0

          const items = item_scores.map(({ item, scores: raw_scores }) => {
            const itemScore =
              raw_scores.find((rs) => rs.measure === 'ipm')?.score ?? NaN
            return {
              type: 'item' as const,
              name: item,
              score: itemScore,
              sortValue: [discoursemeScore, itemScore] satisfies [
                number,
                number,
              ],
              discoursemeId: discourseme_id,
            }
          })

          return [
            {
              type: 'discourseme' as const,
              name: String(discourseme_id),
              score: discoursemeScore,
              sortValue: [discoursemeScore, -Infinity],
              discoursemeId: discourseme_id,
            },
            ...items,
          ]
        })
        .flat(),
    [discoursemeScores],
  )

  return <DataTable columns={columns} rows={rows} />
}

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Discourseme/Item',
    meta: { className: 'py-1' },
    cell: ({ row }) => {
      return row.original.type === 'discourseme' ? (
        <span className="font-bold">
          <span
            className="mr-2 inline-block aspect-square w-2 rounded-full"
            style={{
              backgroundColor: getColorForNumber(row.original.discoursemeId),
            }}
          />
          <DiscoursemeName discoursemeId={row.original.discoursemeId} />
        </span>
      ) : (
        <span className="inline-block pl-4">{row.original.name}</span>
      )
    },
  },
  {
    accessorKey: 'score',
    enableSorting: true,
    meta: { className: 'text-right py-1' },
    sortingFn: (
      { original: { sortValue: sortA, type: typeA } },
      { original: { sortValue: sortB, type: typeB } },
    ) => {
      if (sortA === undefined || sortB === undefined) {
        return 0
      }
      if (sortA[0] === sortB[0]) {
        if (typeA === 'discourseme' && typeB === 'item') {
          return -1
        }
        return sortA[1] - sortB[1]
      }
      return sortA[0] - sortB[0]
    },
    header: ({ column }) => <SortButton column={column}>IPM</SortButton>,
    cell: ({ row }) =>
      isNaN(row.original.score) ? (
        <span className="text-muted-foreground">n.a.</span>
      ) : (
        formatNumber(row.original.score)
      ),
  },
]
