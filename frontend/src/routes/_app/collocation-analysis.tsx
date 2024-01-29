import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/collocation-analysis')({
  component: () => <div>Collocation Analysis</div>,
})
