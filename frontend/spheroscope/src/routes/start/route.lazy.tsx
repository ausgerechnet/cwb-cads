import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/start')({
  component: () => <div>Hello /start!</div>,
})
