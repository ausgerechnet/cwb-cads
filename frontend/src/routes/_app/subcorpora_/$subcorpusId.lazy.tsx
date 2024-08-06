import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { subcorporaList } from '@/lib/queries'

export const Route = createLazyFileRoute('/_app/subcorpora/$subcorpusId')({
  component: Subcorpus,
})

function Subcorpus() {
  const subcorpusId = parseInt(Route.useParams().subcorpusId)
  const { data: subcorpora } = useSuspenseQuery(subcorporaList)
  const subcorpus = subcorpora.find((s) => s.id === subcorpusId)

  return (
    <AppPageFrame title={`Subcorpus: ${subcorpus?.name}`}>
      <div className="whitespace-pre rounded-xl bg-muted p-4 font-mono text-muted-foreground">
        {JSON.stringify(subcorpus, null, 2)}
      </div>
    </AppPageFrame>
  )
}
