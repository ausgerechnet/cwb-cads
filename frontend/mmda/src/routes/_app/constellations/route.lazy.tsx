import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { Eye, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { constellationList, deleteConstellation } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
import { AppPageFrame } from '@/components/app-page-frame'
import { DataTable, SortButton } from '@cads/shared/components/data-table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cads/shared/components/ui/popover'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { ButtonAlert } from '@/components/button-alert'

export const Route = createLazyFileRoute('/_app/constellations')({
  component: ConstellationOverview,
})

function ConstellationOverview() {
  const { data = [] } = useSuspenseQuery(constellationList)
  const navigate = useNavigate()
  return (
    <AppPageFrame
      title="Constellations"
      cta={{
        nav: { to: '/constellations/new' },
        label: 'Create Constellation',
      }}
    >
      <DataTable
        columns={columns}
        rows={data}
        onRowClick={(constellation) => {
          const constellationId = constellation.id?.toString() || null
          // TODO: The value of id should never be undefined. The API should
          // be changed. Then this check can be removed.
          if (constellationId === null) return
          navigate({
            to: `/constellations/$constellationId`,
            params: { constellationId },
          })
        }}
      />
    </AppPageFrame>
  )
}

const columns: ColumnDef<z.infer<typeof schemas.ConstellationOut>>[] = [
  {
    accessorKey: 'id',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>ID</SortButton>,
    meta: { className: 'w-0' },
  },
  {
    accessorKey: 'name',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>Name</SortButton>,
    meta: { className: 'w-72' },
  },
  {
    accessorKey: 'description',
    enableSorting: true,
    header: ({ column }) => (
      <SortButton column={column}>Description</SortButton>
    ),
  },
  {
    id: 'actions',
    enableSorting: true,
    meta: { className: 'w-0' },
    cell: ({ row }) => <QuickActions constellationId={row.original.id} />,
  },
]

function QuickActions({ constellationId }: { constellationId: number }) {
  const router = useRouter()
  const { mutate, isPending, isSuccess } = useMutation({
    ...deleteConstellation,
    onSuccess: (...args) => {
      deleteConstellation.onSuccess?.(...args)
      router.invalidate()
      toast.success('Constellation deleted')
    },
    onError: (...args) => {
      deleteConstellation.onError?.(...args)
      toast.error('An error occurred while deleting the constellation')
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
        <MoreVertical className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          to=""
          params={{ constellationId: String(constellationId) }}
          search={(s) => s}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full',
          )}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Constellation
        </Link>
        <ButtonAlert
          disabled={isPending || isSuccess}
          labelDescription="This will permanently delete the constellation."
          onClick={() => mutate(String(constellationId))}
        >
          Delete Constellation
        </ButtonAlert>
      </PopoverContent>
    </Popover>
  )
}
