import { Fragment, useMemo } from 'react'
import { z } from 'zod'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { schemas } from '@cads/shared/api-client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cads/shared/components/ui/table'
import { Repeat } from '@cads/shared/components/repeat'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { DiscoursemeName } from '@cads/shared/components/discourseme-name'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import {
  measures,
  MeasureSelect,
  useMeasureSelection,
} from '@cads/shared/components/measures'
import { SortButtonView } from '@cads/shared/components/data-table'

export const DiscoursemeCollocateTableSearch = z.object({
  dctSortBy: z.enum(measures).optional(),
  dctSortOrder: z.enum(['ascending', 'descending']).optional(),
  dctHidden: z.array(z.number().int().positive()).optional(),
})

type Discourseme = {
  id: number
  scores: Record<string, number>
  items: {
    scores: Record<string, number>
    item: string
  }[]
}

// TODO: Shares a lot with DiscoursemeBreakdown; consider refactoring to a common component
export function DiscoursemeCollocateTable({
  discoursemeScores,
  isLoading,
  className,
}: {
  discoursemeScores: z.infer<typeof schemas.DiscoursemeScoresOut>[]
  isLoading?: boolean
  className?: string
}) {
  const {
    dctSortBy = measures[0],
    dctSortOrder = 'descending',
    dctHidden,
  } = useSearch({ from: '__root__' })
  const { selectedMeasures, measureNameMap } = useMeasureSelection(dctSortBy)
  const navigate = useNavigate()

  const discoursemes = useMemo(
    () =>
      discoursemeScores
        .map(
          ({
            discourseme_id: id,
            global_scores,
            item_scores,
          }): Discourseme => ({
            id,
            scores: Object.fromEntries(
              (global_scores ?? []).map(
                ({ measure, score }): [string, number] => [measure, score],
              ),
            ),
            items: dctHidden?.includes(id)
              ? []
              : (item_scores ?? [])
                  .map(({ scores, item }) => ({
                    scores: Object.fromEntries(
                      scores.map(({ measure, score }): [string, number] => [
                        measure,
                        score,
                      ]),
                    ),
                    item,
                  }))
                  .toSorted((a, b) => {
                    if (!dctSortOrder || !dctSortBy) return 0
                    return (
                      (a.scores[dctSortBy] - b.scores[dctSortBy]) *
                      (dctSortOrder === 'ascending' ? 1 : -1)
                    )
                  }),
          }),
        )
        .toSorted((a, b) => {
          if (!dctSortOrder || !dctSortBy) return 0
          return (
            (a.scores[dctSortBy] - b.scores[dctSortBy]) *
            (dctSortOrder === 'ascending' ? 1 : -1)
          )
        }),
    [dctHidden, dctSortOrder, dctSortBy, discoursemeScores],
  )

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="flex items-center">
            <MeasureSelect />
            <span className="my-auto">Item</span>
          </TableHead>

          {selectedMeasures.map((measure) => {
            const isCurrent = dctSortBy === measure
            const isSorted = isCurrent
              ? dctSortOrder === 'ascending'
                ? 'asc'
                : 'desc'
              : 'hide'
            return (
              <TableHead key={measure} className="text-right">
                <SortButtonView
                  isSorted={isSorted}
                  onClick={() => {
                    navigate({
                      replace: true,
                      to: '',
                      /**
                      // @ts-ignore */
                      // params: (p) => p,
                      /**
                      // @ts-ignore */
                      search: (s) => {
                        if (isCurrent) {
                          return {
                            ...s,
                            dctSortOrder:
                              dctSortOrder === 'descending'
                                ? 'ascending'
                                : 'descending',
                          }
                        }
                        return {
                          ...s,
                          dctSortBy: measure,
                          dctSortOrder: 'ascending',
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
        {isLoading && (
          <Repeat count={15}>
            <TableRow>
              <TableCell colSpan={measures.length + 1} className="py-1">
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          </Repeat>
        )}

        {!isLoading &&
          (discoursemes ?? []).map(({ id, items, scores }) => (
            <Fragment key={id}>
              <TableRow
                className="discourseme cursor-pointer border-b-0 border-t-2 last:border-2 last:border-t-2"
                onClick={() => {
                  navigate({
                    replace: true,
                    to: '',
                    search: (s) => ({
                      ...s,
                      dctHidden: dctHidden?.includes(id)
                        ? dctHidden.filter((i) => i !== id)
                        : [...(dctHidden ?? []), id],
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

                {selectedMeasures.map((measure) => (
                  <TableCell
                    key={measure}
                    className="py-1 text-right font-mono"
                  >
                    {scores[measure] ?? 'N/A'}
                  </TableCell>
                ))}
              </TableRow>

              {items.map(({ item, scores }) => (
                <TableRow key={item} className="border-0 py-0">
                  <TableCell className="whitespace-nowrap py-1">
                    <span
                      className="mr-2 inline-block aspect-square w-3 rounded-full"
                      style={{}}
                    />
                    {item}
                  </TableCell>

                  {selectedMeasures.map((measure) => (
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
