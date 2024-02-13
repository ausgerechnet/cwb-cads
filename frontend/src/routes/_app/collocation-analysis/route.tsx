import { ErrorComponentProps, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'

import { collocationsQueryOptions } from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const Route = createFileRoute('/_app/collocation-analysis')({
  component: CollocationAnalysis,
  errorComponent: CollocationAnalysisError,
  loader: async ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(collocationsQueryOptions),
})

function CollocationAnalysis() {
  const { data: collocationAnalyses } = useSuspenseQuery(
    collocationsQueryOptions,
  )
  return (
    <Layout>
      Collocation Analysis goes here
      <div className="whitespace-pre rounded-md bg-muted p-2 text-muted-foreground">
        {JSON.stringify(collocationAnalyses, null, '  ')}
      </div>
    </Layout>
  )
}

function CollocationAnalysisError({ error }: ErrorComponentProps) {
  return (
    <Layout>
      <Alert variant="destructive">
        <AlertCircle className="mr-2 h-4 w-4" />
        <AlertTitle>Error loading collocation analysis data</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
      </Alert>
    </Layout>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppPageFrame
      title="Collocation Analysis"
      cta={{
        nav: {
          to: '/collocation-analysis/new',
        },
        label: 'New Collocation Analysis',
      }}
    >
      {children}
    </AppPageFrame>
  )
}
