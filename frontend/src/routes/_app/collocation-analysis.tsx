import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/collocation-analysis').createRoute({
  component: () => <div>Collocation Analysis</div>,
})
