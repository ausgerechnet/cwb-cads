import { z } from 'zod'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { EyeIcon, PlusIcon } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Large } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { corpusById, keywordAnalysesList, subcorpusOf } from '@/lib/queries'
import { DataTable, SortButton } from '@/components/data-table'
import { schemas } from '@/rest-client'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format-number'
import { KeywordAnalysisLayout } from './-keyword-analysis-layout'

export const Route = createLazyFileRoute('/_app/keyword-analysis')({
  component: KeywordAnalysisList,
})

function KeywordAnalysisList() {
  const { data: keywordAnalysisList } = useSuspenseQuery(keywordAnalysesList)
  const hasKeywordAnalysis = keywordAnalysisList.length > 0
  const navigate = useNavigate()

  return (
    <KeywordAnalysisLayout>
      {hasKeywordAnalysis ? (
        <DataTable<z.infer<typeof schemas.KeywordOut>>
          columns={columns}
          rows={keywordAnalysisList}
          onRowClick={(row) => {
            const id = row.id
            if (id === undefined) return
            navigate({
              to: '/keyword-analysis/$analysisId',
              params: { analysisId: id.toString() },
            })
          }}
        />
      ) : (
        <div className="start flex flex-col gap-4">
          <Large>
            No keyword analyses yet.
            <br />
            Create one using the button below.
          </Large>
          <Link
            to="/keyword-analysis/new"
            className={cn(buttonVariants(), 'self-start')}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New Keyword Analysis
          </Link>
        </div>
      )}
    </KeywordAnalysisLayout>
  )
}

// TODO: this is whole component is a hacky workaround. The API should return nicely formatted descriptions
function CorpusCell({
  corpusId = null,
  subcorpusId = null,
}: {
  corpusId: number | null | undefined
  subcorpusId: number | null | undefined
}) {
  const { data: subcorpus, isLoading: isLoadingSubcorpus } = useQuery({
    ...subcorpusOf(subcorpusId ?? 0),
    enabled: subcorpusId !== null,
    select: (data) => data?.find((s) => s.id === subcorpusId),
  })
  const { data: corpus, isLoading: isLoadingCorpus } = useQuery({
    ...corpusById(corpusId ?? 0),
    enabled: corpusId !== null && subcorpusId === null,
  })
  const formattedName =
    subcorpusId === null
      ? corpus?.name
      : `${
          subcorpus?.name ??
          subcorpus?.description ??
          subcorpus?.nqr_cqp ??
          subcorpusId
        } of ${corpus?.name ?? corpus?.description ?? corpusId}`
  const isLoading =
    subcorpusId === null
      ? isLoadingCorpus
      : isLoadingSubcorpus || isLoadingCorpus
  return (
    <div>{isLoading ? <Skeleton className="w-full" /> : formattedName}</div>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.KeywordOut>>[] = [
  {
    accessorKey: 'id',
    enableSorting: true,
    meta: { className: 'w-0' },
    header: ({ column }) => <SortButton column={column}>ID</SortButton>,
  },
  {
    accessorKey: 'sub_vs_rest',
    enableSorting: true,
    header: ({ column }) => (
      <SortButton column={column}>Sub vs. Rest</SortButton>
    ),
    cell: ({ row }) => (row.original.sub_vs_rest ? 'Yes' : 'No'),
  },
  {
    id: 'target',
    header: 'Target',
    cell: ({ row }) => (
      <CorpusCell
        corpusId={row.original.corpus_id}
        subcorpusId={row.original.subcorpus_id}
      />
    ),
  },
  {
    accessorKey: 'p',
    header: () => <>Target Query Layer</>,
  },
  {
    id: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <CorpusCell
        corpusId={row.original.corpus_id_reference}
        subcorpusId={row.original.subcorpus_id_reference}
      />
    ),
  },
  {
    accessorKey: 'p_reference',
    enableSorting: true,
    header: ({ column }) => (
      <SortButton column={column}>Reference Query Layer</SortButton>
    ),
  },
  {
    accessorKey: 'nr_items',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}># Items</SortButton>,
    cell: ({
      row: {
        original: { nr_items },
      },
    }) => (
      <div>
        {nr_items === undefined ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          formatNumber(nr_items)
        )}
      </div>
    ),
  },
  {
    accessorKey: 'min_freq',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>Min. Freq.</SortButton>,
  },
  {
    id: 'actions',
    header: () => null,
    meta: { className: 'w-0' },
    cell: ({ row }) => (
      <Link
        to={`/keyword-analysis/$analysisId`}
        params={{ analysisId: String(row.original.id) }}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'w-full',
        )}
      >
        <EyeIcon className="h-4 w-4" />
      </Link>
    ),
  },
]
