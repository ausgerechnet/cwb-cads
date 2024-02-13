import { toast } from 'sonner'
import {
  createLazyFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Eye, Loader2, MoreVertical, Plus, XSquare } from 'lucide-react'
import { schemas } from '@/rest-client'
import { z } from 'zod'

import { cn } from '@/lib/utils'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large } from '@/components/ui/typography'
import { Button, buttonVariants } from '@/components/ui/button'
import { DataTable, SortButton } from '@/components/data-table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  deleteDiscoursemeMutationOptions,
  discoursemesQueryOptions,
} from '@/lib/queries'

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
    cell: ({ row }) => row.original._items?.join(', '),
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

function Discoursemes() {
  const { data: discoursemes } = useSuspenseQuery(discoursemesQueryOptions)
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
    ...deleteDiscoursemeMutationOptions,
    onSuccess: (...args) => {
      deleteDiscoursemeMutationOptions.onSuccess?.(...args)
      router.invalidate()
      toast.success('Discourseme deleted')
    },
    onError: (...args) => {
      deleteDiscoursemeMutationOptions.onError?.(...args)
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
        <Button
          disabled={isPending || isSuccess}
          variant="destructive"
          className="w-full"
          onClick={() => mutate(discoursemeId)}
          size="sm"
        >
          {isPending || isSuccess ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XSquare className="mr-2 h-4 w-4" />
          )}
          Delete
        </Button>
      </PopoverContent>
    </Popover>
  )
}
