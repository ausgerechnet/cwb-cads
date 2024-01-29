import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/admin')({
  component: () => <div>Admin</div>,
})
