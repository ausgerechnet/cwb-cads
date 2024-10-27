import { toast } from 'sonner'
import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Eye, MoreVertical, Plus } from 'lucide-react'
import { schemas } from '@/rest-client'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import { deleteDiscourseme, discoursemesList } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large } from '@cads/shared/components/ui/typography'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { DataTable, SortButton } from '@/components/data-table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cads/shared/components/ui/popover'
import { ButtonAlert } from '@/components/button-alert'
import { ReactNode } from 'react'

export const Route = createLazyFileRoute('/_app/discoursemes')({
  component: Discoursemes,
})

const columns: ColumnDef<z.infer<typeof schemas.DiscoursemeOut>>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => <SortButton column={column}>ID</SortButton>,
    meta: { className: 'w-0' },
  },
  {
    accessorKey: 'name',
    header: ({ column }) => <SortButton column={column}>Name</SortButton>,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <SortButton column={column}>Description</SortButton>
    ),
  },
  {
    accessorKey: '_items',
    header: 'Items',
    cell: ({ row }) =>
      shortenArray(
        (row.original.template ?? [])
          .map((item) => item.surface)
          .filter((surface) => Boolean(surface)),
        15,
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const discoursemeId = row.original.id?.toString()
      if (discoursemeId === undefined) {
        throw new Error('Discourseme ID is undefined')
      }
      return <QuickActions key={discoursemeId} discoursemeId={discoursemeId} />
    },
    meta: { className: 'w-0' },
  },
]

function shortenArray<T>(array: T[], length: number): ReactNode {
  if (array.length <= length) {
    return array.join(', ')
  }
  return (
    <>
      {array.slice(0, length).join(', ')},{' '}
      <span className="rounded text-muted-foreground">
        {array.length - length} more...
      </span>
    </>
  )
}

function Discoursemes() {
  const { data: discoursemes } = useSuspenseQuery(discoursemesList)
  const navigate = useNavigate()
  return (
    <AppPageFrame
      title="Discoursemes"
      cta={{
        nav: { to: '/discoursemes/new' },
        label: 'New Discourseme',
      }}
    >
      {discoursemes.length === 0 && (
        <>
          <Large>
            No discoursemes yet.
            <br />
            Create one using the button below.
          </Large>
          <Link to="/discoursemes/new" className={cn(buttonVariants(), 'mt-4')}>
            <Plus className="mr-2 h-4 w-4" />
            New Discourseme
          </Link>
        </>
      )}
      <DataTable
        onRowClick={(row) =>
          navigate({
            to: '/discoursemes/$discoursemeId',
            params: { discoursemeId: String(row.id) },
          })
        }
        columns={columns}
        rows={discoursemes}
      />
    </AppPageFrame>
  )
}

function QuickActions({ discoursemeId }: { discoursemeId: string }) {
  const router = useRouter()
  const { mutate, isPending, isSuccess } = useMutation({
    ...deleteDiscourseme,
    onSuccess: (...args) => {
      deleteDiscourseme.onSuccess?.(...args)
      router.invalidate()
      toast.success('Discourseme deleted')
    },
    onError: (...args) => {
      deleteDiscourseme.onError?.(...args)
      toast.error('Failed to delete discourseme')
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
        className="flex flex-col gap-2 "
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          to="/discoursemes/$discoursemeId"
          params={{ discoursemeId }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full',
          )}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Discourseme
        </Link>
        <ButtonAlert
          onClick={() => mutate(discoursemeId)}
          labelDescription="This will permanently delete the discourseme."
          disabled={isPending || isSuccess}
        >
          Delete Discourseme
        </ButtonAlert>
      </PopoverContent>
    </Popover>
  )
}
