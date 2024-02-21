import { createLazyFileRoute } from '@tanstack/react-router'
import WordCloud from '@/components/word-cloud'

export const Route = createLazyFileRoute(
  '/_app/collocation-analysis/$collocationId',
)({
  component: CollocationAnalysis,
})

function CollocationAnalysis() {
  return (
    <div className="-m-2">
      <WordCloud />
    </div>
  )
}
