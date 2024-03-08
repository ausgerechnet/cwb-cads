import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import {
  queryBreakdownForPQueryOptions,
  queryQueryOptions,
} from '@/lib/queries'
import { schemas } from '@/rest-client'
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectTrigger,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, SortButton } from '@/components/data-table'
import { ErrorMessage } from '@/components/error-message'
import { Headline3 } from '@/components/ui/typography'

const emptyArray = [] as const

export function QueryBreakdown({ queryId }: { queryId: string }) {
  const { pAtt } = useSearch({ from: '/_app/queries/$queryId' })
  const { data: query, error: errorQuery } = useQuery(
    queryQueryOptions(queryId),
  )
  const parsePAtt = useCallback(
    (pAtt: string | undefined) => {
      const availablePAtts = query?.corpus?.p_atts ?? []
      if (pAtt === undefined && availablePAtts.length > 0) {
        return availablePAtts[0]
      }
      if (pAtt !== undefined && availablePAtts.includes(pAtt)) {
        return pAtt
      }
      return undefined
    },
    [query?.corpus?.p_atts],
  )
  const navigate = useNavigate()
  const validatedPAtt = parsePAtt(pAtt)
  const {
    data: breakdown,
    isLoading,
    isPaused,
    error: errorBreakdown,
  } = useQuery({
    ...queryBreakdownForPQueryOptions(queryId, validatedPAtt as string),
    enabled: validatedPAtt !== undefined,
  })

  const handlePAttChange = (pAtt: string) => {
    navigate({
      replace: true,
      params: (p) => p,
      search: (s) => ({ ...s, pAtt: parsePAtt(pAtt) }),
    })
  }

  const pAtts = query?.corpus?.p_atts ?? emptyArray

  return (
    <>
      <div className="mb-2 flex w-full justify-between">
        <Headline3 className="mr-auto w-max text-lg leading-normal">
          Frequency Breakdown
        </Headline3>
        <Select onValueChange={handlePAttChange} value={validatedPAtt}>
          <SelectTrigger className="ml-auto h-7 w-auto">
            <SelectValue placeholder="Select a Comparison Layer" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {pAtts.map((pAtt) => (
                <SelectItem key={pAtt} value={pAtt}>
                  {pAtt}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {breakdown && <BreakdownTable breakdown={breakdown} />}
      {!breakdown && isLoading && !isPaused && (
        <Skeleton className="h-80 w-full rounded-md" />
      )}
      <ErrorMessage className="mt-4" error={errorQuery} />
      <ErrorMessage className="mt-4" error={errorBreakdown} />
    </>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.BreakdownItemsOut>>[] = [
  {
    accessorKey: 'item',
    header: ({ column }) => <SortButton column={column}>Item</SortButton>,
    meta: { className: 'w-1/2' },
  },
  {
    accessorKey: 'freq',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>Frequency</SortButton>,
    meta: { className: 'w-1/2' },
  },
]

function BreakdownTable({
  breakdown,
}: {
  breakdown: z.infer<typeof schemas.BreakdownOut>
}) {
  const rows = breakdown.items ?? []
  return <DataTable columns={columns} rows={rows} />
}
