import { AppPageFrame } from '@/components/app-page-frame'
import { corpusById } from '@/lib/queries'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/corpora/$corpusId')({
  component: CorpusDetail,
})

function CorpusDetail() {
  const corpusId = parseInt(Route.useParams().corpusId)
  const { data: corpus } = useSuspenseQuery(corpusById(corpusId))

  return (
    <AppPageFrame title={`Corpus: ${corpus.name}`}>
      <div className="whitespace-pre rounded-xl bg-muted p-4 font-mono text-muted-foreground">
        {JSON.stringify(corpus, null, 2)}
      </div>
    </AppPageFrame>
  )
}
