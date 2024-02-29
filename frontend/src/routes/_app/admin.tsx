import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { getUsersQueryOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { DataTable, SortButton } from '@/components/data-table'

export const Route = createFileRoute('/_app/admin')({
  component: Admin,
  loader: async ({ context: { queryClient } }) => ({
    users: await queryClient.ensureQueryData(getUsersQueryOptions),
  }),
})

function Admin() {
  const { data: users = [] } = useSuspenseQuery(getUsersQueryOptions)
  return (
    <AppPageFrame title="Admin">
      <DataTable<z.infer<typeof schemas.ConstellationOut>>
        columns={columns}
        rows={users}
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
    accessorKey: 'username',
    enableSorting: true,
    header: ({ column }) => <SortButton column={column}>Username</SortButton>,
  },
]
