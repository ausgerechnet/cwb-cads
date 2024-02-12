import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_app/collocation-analysis/$collocationId',
)({
  component: () => <div>Hello /_app/collocation-analysis/$collocationId!</div>,
})
