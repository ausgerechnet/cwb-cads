import { AppPageFrame } from '@/components/app-page-frame'
import { FileRoute, Outlet } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/discoursemes').createRoute({
  component: Discoursemes,
})

function Discoursemes() {
  return (
    <AppPageFrame
      title="Discoursemes"
      cta={{
        to: '/discoursemes/new',
        label: 'New Discourseme',
      }}
    >
      <Outlet />
    </AppPageFrame>
  )
}
