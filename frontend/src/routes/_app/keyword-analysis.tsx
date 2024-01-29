import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/keyword-analysis')({
  component: () => <div>Keyword Analysis</div>,
})
