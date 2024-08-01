import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

import { AppPageFrame } from '@/components/app-page-frame'
import { buttonVariants } from '@/components/ui/button'
import { Large } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { keywordAnalysesList } from '@/lib/queries'

export const Route = createLazyFileRoute('/_app/keyword-analysis')({
  component: KeywordAnalysisList,
  pendingComponent: LoaderKeywordAnalysis,
})

function KeywordAnalysisList() {
  const { data: keywordAnalysisList } = useSuspenseQuery(keywordAnalysesList)
  const hasKeywordAnalysis = keywordAnalysisList.length > 0

  return (
    <AppPageFrame
      title="Keyword Analysis"
      cta={{
        nav: { to: '/keyword-analysis/new' },
        label: 'New Keyword Analyses',
      }}
    >
      {!hasKeywordAnalysis && (
        <div className="start flex flex-col gap-4">
          <Large>
            No keyword analyses yet.
            <br />
            Create one using the button below.
          </Large>
          <Link
            to="/keyword-analysis/new"
            className={cn(buttonVariants(), 'self-start')}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New Keyword Analysis
          </Link>
        </div>
      )}
      {
        <div className="whitespace-pre rounded-lg bg-muted p-2 font-mono text-muted-foreground">
          {JSON.stringify(keywordAnalysisList, null, 2)}
        </div>
      }
    </AppPageFrame>
  )
}

function LoaderKeywordAnalysis() {
  return (
    <AppPageFrame
      title="Keyword Analysis"
      cta={{
        nav: { to: '/keyword-analysis/new' },
        label: 'New Keyword Analysis',
      }}
    >
      <h1>Loading...</h1>
    </AppPageFrame>
  )
}
