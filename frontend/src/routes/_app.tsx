import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import { FileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = new FileRoute('/_app').createRoute({
  component: () => <App />,
})

function App() {
  return (
    <div className="grid grid-cols-[max-content_1fr]">
      <nav className="flex flex-col gap-2 p-2">
        <Link
          className={navigationMenuTriggerStyle()}
          to="/queries"
          activeProps={{ className: 'font-bold' }}
        >
          Queries
        </Link>
        <Link className={navigationMenuTriggerStyle()} to="/queries">
          Collocation Analysis
        </Link>
        <Link className={navigationMenuTriggerStyle()} to="/queries">
          Keyword Analysis
        </Link>
        <Link className={navigationMenuTriggerStyle()} to="/queries">
          Discoursemes
        </Link>
        <Link className={navigationMenuTriggerStyle()} to="/queries">
          Subcorpora
        </Link>
        <Link className={navigationMenuTriggerStyle()} to="/queries">
          Admin
        </Link>
      </nav>

      <div className="p-2">
        <Outlet />
      </div>
    </div>
  )
}
