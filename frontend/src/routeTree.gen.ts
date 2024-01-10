import { Route as rootRoute } from './routes/__root'
import { Route as ExampleImport } from './routes/example'
import { Route as IndexImport } from './routes/index'

const ExampleRoute = ExampleImport.update({
  path: '/example',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/example': {
      preLoaderRoute: typeof ExampleImport
      parentRoute: typeof rootRoute
    }
  }
}
export const routeTree = rootRoute.addChildren([IndexRoute, ExampleRoute])
