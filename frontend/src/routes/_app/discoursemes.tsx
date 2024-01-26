import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/discoursemes').createRoute({
  component: () => <div>Discoursemes</div>,
})
