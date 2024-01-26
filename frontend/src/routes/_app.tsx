import { FileRoute, Outlet } from '@tanstack/react-router'
import { MenuLink } from '@/components/menu-link'

export const Route = new FileRoute('/_app').createRoute({
  component: () => <App />,
})

function App() {
  return (
    <div className="grid grid-cols-[max-content_1fr]">
      <nav className="flex flex-col gap-2 p-2">
        <MenuLink to="/queries">Queries</MenuLink>
        <MenuLink to="/collocation-analysis">Collocation Analysis</MenuLink>
        <MenuLink to="/keyword-analysis">Keyword Analysis</MenuLink>
        <MenuLink to="/discoursemes">Discoursemes</MenuLink>
        <MenuLink to="/subcorpora">Subcorpora</MenuLink>
        <MenuLink to="/admin">Admin</MenuLink>
      </nav>

      <div className="p-2">
        <Outlet />
      </div>
    </div>
  )
}
