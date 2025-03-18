import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_app/keyword-analysis_/$analysisId/semantic-map',
)({
  component: () => <div>Hello /_app/keyword-analysis_/semantic-map!</div>,
})
