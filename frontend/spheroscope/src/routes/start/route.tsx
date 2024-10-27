import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/start')({
  component: () => <div>Hello /start!</div>,
})
