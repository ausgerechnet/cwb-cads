import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/keyword-analysis').createRoute({
  component: () => <div>Keyword Analysis</div>,
})
