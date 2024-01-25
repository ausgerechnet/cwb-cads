import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import { Headline1 } from '@/components/ui/typography'
import { Link, FileRoute } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

export const Route = new FileRoute('/_app/queries/new').createRoute({
  component: QueriesNew,
})

function QueriesNew() {
  return (
    <div className="p-2">
      <Link to="/queries" className={navigationMenuTriggerStyle()}>
        <ChevronLeft className="mr-2 h-4 w-4" />
        Queries
      </Link>
      <Headline1>New Query</Headline1>
    </div>
  )
}
