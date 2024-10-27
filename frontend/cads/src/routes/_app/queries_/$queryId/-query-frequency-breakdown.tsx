import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { corpusById, queryBreakdownForP, queryById } from '@cads/shared/queries'
import { schemas } from '@/rest-client'
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectTrigger,
} from '@cads/shared/components/ui/select'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { DataTable, SortButton } from '@/components/data-table'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Headline3 } from '@cads/shared/components/ui/typography'

export function QueryFrequencyBreakdown({ queryId }: { queryId: number }) {
  const { pAtt } = useSearch({ from: '/_app/queries/$queryId' })
  const { data: query, error: errorQuery } = useQuery(queryById(queryId))
  const { data: { p_atts: pAtts = [] } = {}, error: errorCorpus } = useQuery({
    ...corpusById(query?.corpus_id ?? -1),
    enabled: query?.corpus_id !== undefined,
  })
  const parsePAtt = useCallback(
    (pAtt: string | undefined) => {
      if (pAtt === undefined && pAtts.length > 0) {
        return pAtts[0]
      }
      if (pAtt !== undefined && pAtts.includes(pAtt)) {
        return pAtt
      }
      return undefined
    },
    [pAtts],
  )
  const navigate = useNavigate()
  const validatedPAtt = parsePAtt(pAtt)
  const {
    data: breakdown,
    isLoading,
    isPaused,
    error: errorBreakdown,
  } = useQuery({
    ...queryBreakdownForP(queryId, validatedPAtt as string),
    enabled: validatedPAtt !== undefined,
  })

  const handlePAttChange = (pAtt: string) => {
    navigate({
      replace: true,
      params: (p) => p,
      search: (s) => ({ ...s, pAtt: parsePAtt(pAtt) }),
    })
  }

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
      <ErrorMessage className="mt-4" error={errorCorpus} />
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
