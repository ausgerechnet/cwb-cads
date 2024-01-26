import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/subcorpora').createRoute({
  component: () => <div>Subcorpora</div>,
})
