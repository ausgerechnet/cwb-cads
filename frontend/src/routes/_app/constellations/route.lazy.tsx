import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { ColumnDef } from '@tanstack/react-table'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { constellationListQueryOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { DataTable, SortButton } from '@/components/data-table'

export const Route = createLazyFileRoute('/_app/constellations')({
  component: ConstellationOverview,
})

function ConstellationOverview() {
  const { data = [] } = useSuspenseQuery(constellationListQueryOptions)
  const navigate = useNavigate()
  return (
    <AppPageFrame
      title="Constellations"
      cta={{
        nav: {
          to: '/constellations/new',
        },
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
]
