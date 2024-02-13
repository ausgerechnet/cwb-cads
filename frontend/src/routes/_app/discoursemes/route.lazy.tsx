import { toast } from 'sonner'
import { useState } from 'react'
import { createLazyFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { Loader2, MoreVertical, Plus, XSquare } from 'lucide-react'
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
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
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
    cell: ({ row }) => (
      <QuickActions key={row.original.id ?? ''} discourseme={row.original} />
    ),
    meta: { className: 'w-0' },
  },
]

function Discoursemes() {
  const { data: discoursemes } = useSuspenseQuery(discoursemesQueryOptions)
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
      <DataTable columns={columns} rows={discoursemes} />
    </AppPageFrame>
  )
}

function QuickActions({
  discourseme,
}: {
  discourseme: z.infer<typeof schemas.DiscoursemeOut>
}) {
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
  const discoursemeId = discourseme.id?.toString()
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
        <Button
          disabled={isPending || isSuccess}
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (discoursemeId !== undefined) {
              mutate(discoursemeId)
            }
          }}
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
