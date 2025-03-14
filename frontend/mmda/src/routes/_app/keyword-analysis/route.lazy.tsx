import { z } from 'zod'
import { useQuery, useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { EyeIcon, MoreVerticalIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { buttonVariants } from '@cads/shared/components/ui/button'
import { Large } from '@cads/shared/components/ui/typography'
import { cn } from '@cads/shared/lib/utils'
import {
  corpusById,
  deleteKeywordAnalysis,
  keywordAnalysesList,
  subcorpusOf,
} from '@cads/shared/queries'
import { DataTable, SortButton } from '@cads/shared/components/data-table'
import { schemas } from '@/rest-client'
import { Skeleton } from '@cads/shared/components/ui/skeleton'
import { formatNumber } from '@cads/shared/lib/format-number'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cads/shared/components/ui/popover'
import { ButtonAlert } from '@/components/button-alert'
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
    cell: ({ row }) => <QuickActions analysisId={row.original.id} />,
  },
]

function QuickActions({ analysisId }: { analysisId: number }) {
  const { mutate, isPending, isSuccess } = useMutation({
    ...deleteKeywordAnalysis,
    onSuccess: (...args) => {
      deleteKeywordAnalysis.onSuccess?.(...args)
      toast.success('Keyword analysis deleted')
    },
    onError: (...args) => {
      deleteKeywordAnalysis.onError?.(...args)
      // TOFIX: Displays error although backend is fine
      toast.error('An error occurred while deleting the keyword analysis')
    },
  })
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          '-my-3',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <MoreVerticalIcon className="h-4 w-4" />
      </PopoverTrigger>

      <PopoverContent
        className="flex flex-col gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          to="/keyword-analysis/$analysisId"
          params={{ analysisId: analysisId.toString() }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full',
          )}
        >
          <EyeIcon className="mr-2 h-4 w-4" />
          View Keyword Analysis
        </Link>
        <ButtonAlert
          disabled={isPending || isSuccess}
          onClick={() => mutate({ analysisId })}
          labelDescription="This will permanently delete the keyword analysis"
        >
          Delete Keyword Analysis
        </ButtonAlert>
      </PopoverContent>
    </Popover>
  )
}
