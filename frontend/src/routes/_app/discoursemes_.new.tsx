import { AppPageFrame } from '@/components/app-page-frame'
import { FileRoute, Outlet } from '@tanstack/react-router'

export const Route = new FileRoute('/_app/discoursemes/new').createRoute({
  component: DiscoursemesNew,
})

function DiscoursemesNew() {
  return (
    <AppPageFrame title="New Discourseme">
      <Outlet />
    </AppPageFrame>
  )
}
