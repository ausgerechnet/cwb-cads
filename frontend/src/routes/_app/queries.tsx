import { FileRoute, Link } from '@tanstack/react-router'
import { queriesQueryOptions } from '@/data/queries'
import { buttonVariants } from '@/components/ui/button'
import { Headline1 } from '@/components/ui/typography'
import { Plus } from 'lucide-react'

export const Route = new FileRoute('/_app/queries').createRoute({
  component: QueriesNew,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(queriesQueryOptions),
})

function QueriesNew() {
  const queries = Route.useLoaderData()

  console.log('queries', queries)

  return (
    <div className="grid grid-cols-[auto_max-content] p-2">
      <Headline1>Queries Overview</Headline1>
      <Link to="/queries/new" className={buttonVariants()}>
        <Plus className="mr-2 h-4 w-4" />
        New Query
      </Link>
      <div className="col-span-full">
        <p>Queries: {queries.length}</p>
      </div>
    </div>
  )
}
