import { Fragment, useMemo } from 'react'
import { z } from 'zod'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
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
import { Button } from '@cads/shared/components/ui/button'

// TODO: very WET, extract this
const measureOrder = [
  'conservative_log_ratio',
  'O11',
  'E11',
  'ipm',
  'log_likelihood',
  'z_score',
  't_score',
  'simple_ll',
  'dice',
  'log_ratio',
  'min_sensitivity',
  'liddell',
  'mutual_information',
  'local_mutual_information',
] as const

const measureMap: Record<(typeof measureOrder)[number], string> = {
  conservative_log_ratio: 'Cons. Log Ratio',
  O11: 'O11',
  E11: 'E11',
  ipm: 'ipm',
  log_likelihood: 'Log Likelihood',
  z_score: 'Z Score',
  t_score: 'T Score',
  simple_ll: 'Simple LL',
  dice: 'dice',
  log_ratio: 'Log Ratio',
  min_sensitivity: 'Min Sensitivity',
  liddell: 'Liddell',
  mutual_information: 'Mutual Info.',
  local_mutual_information: 'Local Mutual Info.',
}

export const DiscoursemeCollocateTableSearch = z.object({
  dctSortBy: z.enum(measureOrder).optional(),
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
    dctSortBy = 'conservative_log_ratio',
    dctSortOrder = 'descending',
    dctHidden,
  } = useSearch({ from: '__root__' })
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
          <TableHead>Item</TableHead>
          {measureOrder.map((measure) => {
            const isCurrent = dctSortBy === measure
            return (
              <TableHead key={measure} className="text-right">
                <Button
                  variant="ghost"
                  className="-mx-2 inline-flex h-auto gap-1 px-2 leading-none"
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
                  {isCurrent && dctSortOrder === 'ascending' && (
                    <ArrowDownIcon className="h-3 w-3" />
                  )}
                  {isCurrent && dctSortOrder === 'descending' && (
                    <ArrowUpIcon className="h-3 w-3" />
                  )}
                  {measureMap[measure]}
                </Button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>

      <TableBody className="[&_tr.discourseme:last-child]:border-t-2">
        {isLoading && (
          <Repeat count={15}>
            <TableRow>
              <TableCell colSpan={measureOrder.length + 1} className="py-1">
                <Skeleton className="h-4 w-full" />
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

                {measureOrder.map((measure) => (
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
