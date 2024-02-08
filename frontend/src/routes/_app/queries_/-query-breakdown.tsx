import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  queryBreakdownForPQueryOptions,
  queryQueryOptions,
} from '@/lib/queries'
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectTrigger,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const emptyArray = [] as const

export function QueryBreakdown({ queryId }: { queryId: string }) {
  const [selectedPAtt, setSelectedPAtt] = useState<string | undefined>(
    undefined,
  )
  const { data: query } = useQuery(queryQueryOptions(queryId))
  const {
    data: breakdown,
    isLoading,
    isPaused,
  } = useQuery({
    ...queryBreakdownForPQueryOptions(queryId, selectedPAtt as string),
    enabled: selectedPAtt !== undefined,
  })

  const pAtts = query?.corpus?.p_atts ?? emptyArray

  return (
    <div className="inline-block max-w-md">
      <h1>Query Breakdown</h1>
      <Select onValueChange={setSelectedPAtt} value={selectedPAtt}>
        <SelectTrigger>
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
      <div className="whitespace-pre rounded-md bg-muted p-2 text-sm leading-none text-muted-foreground">
        {isLoading && !isPaused ? (
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        ) : null}
        {JSON.stringify(breakdown, null, 2)}
      </div>
    </div>
  )
}
