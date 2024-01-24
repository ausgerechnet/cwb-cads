import { Route as rootRoute } from './routes/__root'
import { Route as VignetteImport } from './routes/vignette'
import { Route as LoginImport } from './routes/login'
import { Route as AppImport } from './routes/app'
import { Route as IndexImport } from './routes/index'
import { Route as AppQueriesNewImport } from './routes/app/queries/new'

const VignetteRoute = VignetteImport.update({
  path: '/vignette',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const AppRoute = AppImport.update({
  path: '/app',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AppQueriesNewRoute = AppQueriesNewImport.update({
  path: '/queries/new',
  getParentRoute: () => AppRoute,
} as any)
declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/app': {
      preLoaderRoute: typeof AppImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/vignette': {
      preLoaderRoute: typeof VignetteImport
      parentRoute: typeof rootRoute
    }
    '/app/queries/new': {
      preLoaderRoute: typeof AppQueriesNewImport
      parentRoute: typeof AppImport
    }
  }
}
export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AppRoute.addChildren([AppQueriesNewRoute]),
  LoginRoute,
  VignetteRoute,
])
