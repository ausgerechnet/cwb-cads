import { Route as rootRoute } from './routes/__root'
import { Route as VignetteImport } from './routes/vignette'
import { Route as LogoutImport } from './routes/logout'
import { Route as LoginImport } from './routes/login'
import { Route as AppImport } from './routes/_app'
import { Route as IndexImport } from './routes/index'
import { Route as AppSubcorporaImport } from './routes/_app/subcorpora'
import { Route as AppQueriesImport } from './routes/_app/queries'
import { Route as AppKeywordAnalysisImport } from './routes/_app/keyword-analysis'
import { Route as AppDiscoursemesImport } from './routes/_app/discoursemes'
import { Route as AppCollocationAnalysisImport } from './routes/_app/collocation-analysis'
import { Route as AppAdminImport } from './routes/_app/admin'
import { Route as AppQueriesNewImport } from './routes/_app/queries_.new'

const VignetteRoute = VignetteImport.update({
  path: '/vignette',
  getParentRoute: () => rootRoute,
} as any)

const LogoutRoute = LogoutImport.update({
  path: '/logout',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const AppRoute = AppImport.update({
  id: '/_app',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AppSubcorporaRoute = AppSubcorporaImport.update({
  path: '/subcorpora',
  getParentRoute: () => AppRoute,
} as any)

const AppQueriesRoute = AppQueriesImport.update({
  path: '/queries',
  getParentRoute: () => AppRoute,
} as any)

const AppKeywordAnalysisRoute = AppKeywordAnalysisImport.update({
  path: '/keyword-analysis',
  getParentRoute: () => AppRoute,
} as any)

const AppDiscoursemesRoute = AppDiscoursemesImport.update({
  path: '/discoursemes',
  getParentRoute: () => AppRoute,
} as any)

const AppCollocationAnalysisRoute = AppCollocationAnalysisImport.update({
  path: '/collocation-analysis',
  getParentRoute: () => AppRoute,
} as any)

const AppAdminRoute = AppAdminImport.update({
  path: '/admin',
  getParentRoute: () => AppRoute,
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
    '/_app': {
      preLoaderRoute: typeof AppImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/logout': {
      preLoaderRoute: typeof LogoutImport
      parentRoute: typeof rootRoute
    }
    '/vignette': {
      preLoaderRoute: typeof VignetteImport
      parentRoute: typeof rootRoute
    }
    '/_app/admin': {
      preLoaderRoute: typeof AppAdminImport
      parentRoute: typeof AppImport
    }
    '/_app/collocation-analysis': {
      preLoaderRoute: typeof AppCollocationAnalysisImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes': {
      preLoaderRoute: typeof AppDiscoursemesImport
      parentRoute: typeof AppImport
    }
    '/_app/keyword-analysis': {
      preLoaderRoute: typeof AppKeywordAnalysisImport
      parentRoute: typeof AppImport
    }
    '/_app/queries': {
      preLoaderRoute: typeof AppQueriesImport
      parentRoute: typeof AppImport
    }
    '/_app/subcorpora': {
      preLoaderRoute: typeof AppSubcorporaImport
      parentRoute: typeof AppImport
    }
    '/_app/queries/new': {
      preLoaderRoute: typeof AppQueriesNewImport
      parentRoute: typeof AppImport
    }
  }
}
export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AppRoute.addChildren([
    AppAdminRoute,
    AppCollocationAnalysisRoute,
    AppDiscoursemesRoute,
    AppKeywordAnalysisRoute,
    AppQueriesRoute,
    AppSubcorporaRoute,
    AppQueriesNewRoute,
  ]),
  LoginRoute,
  LogoutRoute,
  VignetteRoute,
])
