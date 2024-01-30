import { createFileRoute, Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'

import { discoursemesQueryOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large } from '@/components/ui/typography'

export const Route = createFileRoute('/_app/discoursemes')({
  component: Discoursemes,
  loader: async ({ context: { queryClient } }) => ({
    discoursemes: await queryClient.ensureQueryData(discoursemesQueryOptions),
  }),
})

function Discoursemes() {
  const { discoursemes } = Route.useLoaderData()
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
          <Link to="/discoursemes/new">New Discourseme</Link>
        </>
      )}
      {discoursemes.map((discourseme) => (
        <div key={discourseme.id}>
          {discourseme.name}
          {discourseme.description}
          {discourseme._items?.join(', ')}
          <Link
            to="/discoursemes/$discoursemeId"
            params={{ discoursemeId: String(discourseme.id) }}
          >
            <Eye className="mr-2 h-4 w-4" />
          </Link>
          <div className="whitespace-pre bg-muted p-2 text-muted-foreground">
            {JSON.stringify(discourseme, null, 2)}
          </div>
        </div>
      ))}
    </AppPageFrame>
  )
}
