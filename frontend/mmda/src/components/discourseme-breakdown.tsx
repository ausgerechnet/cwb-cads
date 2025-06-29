import { Fragment, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { z } from 'zod'

import { schemas } from '@cads/shared/api-client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { DiscoursemeName } from '@cads/shared/components/discourseme-name'
import { SortButtonView } from '@cads/shared/components/data-table'
import { measureNameMap } from '@cads/shared/components/measures'

export const DiscoursemeBreakdownSearch = z.object({
  dbSortBy: z.enum(['O11', 'ipm']).optional().catch('ipm'),
  dbSortOrder: z
    .enum(['ascending', 'descending'])
    .optional()
    .catch('descending'),
  dbHidden: z.array(z.number().int().positive()).optional(),
})

const measureOrder = ['O11', 'ipm'] as const

type Discourseme = {
  id: number
  scores: Record<string, number>
  items: {
    scores: Record<string, number>
    item: string
  }[]
}

export function DiscoursemeBreakdown({
  breakdown,
  className,
}: {
  breakdown: z.infer<typeof schemas.ConstellationBreakdownOut>
  className?: string
}) {
  const {
    dbSortBy = 'ipm',
    dbSortOrder = 'descending',
    dbHidden,
  } = useSearch({
    from: '__root__',
  })
  const navigate = useNavigate()

  const discoursemes = useMemo((): Discourseme[] => {
    return breakdown.items
      .filter((item) => item.source === 'discoursemes')
      .map(({ freq, ipm, discourseme_id: id }) => {
        const scores = {
          O11: freq,
          ipm,
        }
        return {
          id,
          scores,
          items: dbHidden?.includes(id)
            ? []
            : breakdown.items
                .filter(
                  (item) =>
                    item.discourseme_id === id &&
                    item.source === 'discourseme_items',
                )
                .map(({ item, freq, ipm }) => ({
                  item,
                  scores: {
                    O11: freq,
                    ipm,
                  },
                }))
                .toSorted((a, b) => {
                  if (!dbSortOrder || !dbSortBy) return 0
                  return (
                    (a.scores[dbSortBy] - b.scores[dbSortBy]) *
                    (dbSortOrder === 'ascending' ? 1 : -1)
                  )
                }),
        }
      })
      .toSorted((a, b) => {
        if (!dbSortOrder || !dbSortBy) return 0
        return (
          (a.scores[dbSortBy] - b.scores[dbSortBy]) *
          (dbSortOrder === 'ascending' ? 1 : -1)
        )
      })
  }, [breakdown, dbSortBy, dbSortOrder, dbHidden])

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>

          {measureOrder.map((measure) => {
            const isCurrent = dbSortBy === measure
            const isSorted = isCurrent
              ? dbSortOrder === 'ascending'
                ? 'asc'
                : 'desc'
              : 'hide'
            return (
              <TableHead key={measure} className="text-right">
                <SortButtonView
                  isSorted={isSorted}
                  onClick={() => {
                    navigate({
                      to: '.',
                      params: (p) => p,
                      search: (s) => {
                        if (isCurrent) {
                          return {
                            ...s,
                            dbSortOrder:
                              dbSortOrder === 'descending'
                                ? 'ascending'
                                : 'descending',
                          }
                        }
                        return {
                          ...s,
                          dbSortBy: measure,
                          dbSortOrder: 'ascending',
                        }
                      },
                    })
                  }}
                >
                  {measureNameMap.get(measure)}
                </SortButtonView>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>

      <TableBody className="[&_tr.discourseme:last-child]:border-t-2">
        {(discoursemes ?? []).map(({ id, items, scores }) => (
          <Fragment key={id}>
            <TableRow
              className="discourseme cursor-pointer border-b-0 border-t-2"
              onClick={() => {
                navigate({
                  replace: true,
                  to: '.',
                  params: (p) => p,
                  search: (s) => ({
                    ...s,
                    dbHidden: dbHidden?.includes(id)
                      ? dbHidden.filter((i) => i !== id)
                      : [...(dbHidden ?? []), id],
                  }),
                })
              }}
            >
              <TableCell className="whitespace-nowrap py-1 font-bold">
                <span
                  className="mr-2 inline-block aspect-square w-3 rounded-full"
                  style={{
                    backgroundColor: getColorForNumber(id),
                  }}
                />

                <DiscoursemeName discoursemeId={id} />
              </TableCell>

              {measureOrder.map((measure) => (
                <TableCell key={measure} className="py-1 text-right font-mono">
                  {scores[measure] ?? 'N/A'}
                </TableCell>
              ))}
            </TableRow>

            {items.map(({ item, scores }) => (
              <TableRow key={item + id} className="border-0 py-0">
                <TableCell className="whitespace-nowrap py-1">
                  <span
                    className="mr-2 inline-block aspect-square w-3 rounded-full"
                    style={{}}
                  />
                  {item}
                </TableCell>

                {measureOrder.map((measure) => (
                  <TableCell
                    key={measure}
                    className="py-1 text-right font-mono"
                  >
                    {scores[measure] ?? 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}
