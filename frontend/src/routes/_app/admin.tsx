import { FileRoute } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/admin').createRoute({
  component: () => <div>Admin</div>,
})
