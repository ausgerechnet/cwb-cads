import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { Eye, Plus } from 'lucide-react'

import { AppPageFrame } from '@/components/app-page-frame'
import { Large } from '@/components/ui/typography'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const Route = createLazyFileRoute('/_app/discoursemes')({
  component: Discoursemes,
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
          <Link to="/discoursemes/new" className={cn(buttonVariants(), 'mt-4')}>
            <Plus className="mr-2 h-4 w-4" />
            New Discourseme
          </Link>
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
