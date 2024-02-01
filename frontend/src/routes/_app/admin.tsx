import { AppPageFrame } from '@/components/app-page-frame'
import { getUsersQueryOptions } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/admin')({
  component: Admin,
  loader: async ({ context: { queryClient } }) => ({
    users: await queryClient.ensureQueryData(getUsersQueryOptions),
  }),
})

function Admin() {
  const { users } = Route.useLoaderData()
  return (
    <AppPageFrame title="Admin">
      <div className="whitespace-pre rounded-md bg-muted p-2 text-muted-foreground">
        {JSON.stringify(users, null, '  ')}
      </div>
    </AppPageFrame>
  )
}
