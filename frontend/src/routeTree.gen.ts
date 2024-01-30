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
import { Route as AppQueriesRouteImport } from './routes/_app/queries/route'
import { Route as AppSubcorporaNewImport } from './routes/_app/subcorpora_.new'
import { Route as AppQueriesNewImport } from './routes/_app/queries_/new'
import { Route as AppQueriesQueryIdImport } from './routes/_app/queries_/$queryId'
import { Route as AppQueriesLazyImport } from './routes/_app/queries.lazy'
import { Route as AppDiscoursemesNewImport } from './routes/_app/discoursemes_.new'
import { Route as AppDiscoursemesDiscoursemeIdImport } from './routes/_app/discoursemes_.$discoursemeId'
import { Route as AppQueriesErrorComponentLazyImport } from './routes/_app/queries.errorComponent.lazy'
import { Route as AppQueriesComponentLazyImport } from './routes/_app/queries.component.lazy'

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

const AppQueriesRouteRoute = AppQueriesRouteImport.update({
  path: '/queries',
  getParentRoute: () => AppRoute,
} as any)

const AppSubcorporaNewRoute = AppSubcorporaNewImport.update({
  path: '/subcorpora/new',
  getParentRoute: () => AppRoute,
} as any)

const AppQueriesNewRoute = AppQueriesNewImport.update({
  path: '/queries/new',
  getParentRoute: () => AppRoute,
} as any)

const AppQueriesQueryIdRoute = AppQueriesQueryIdImport.update({
  path: '/queries/$queryId',
  getParentRoute: () => AppRoute,
} as any)

const AppQueriesLazyRoute = AppQueriesLazyImport.update({
  path: '/lazy',
  getParentRoute: () => AppQueriesRoute,
} as any)

const AppDiscoursemesNewRoute = AppDiscoursemesNewImport.update({
  path: '/discoursemes/new',
  getParentRoute: () => AppRoute,
} as any)

const AppDiscoursemesDiscoursemeIdRoute =
  AppDiscoursemesDiscoursemeIdImport.update({
    path: '/discoursemes/$discoursemeId',
    getParentRoute: () => AppRoute,
  } as any)

const AppQueriesErrorComponentLazyRoute =
  AppQueriesErrorComponentLazyImport.update({
    path: '/errorComponent/lazy',
    getParentRoute: () => AppQueriesRoute,
  } as any)

const AppQueriesComponentLazyRoute = AppQueriesComponentLazyImport.update({
  path: '/component/lazy',
  getParentRoute: () => AppQueriesRoute,
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
    '/_app/queries': {
      preLoaderRoute: typeof AppQueriesRouteImport
      parentRoute: typeof AppImport
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
    '/_app/discoursemes/$discoursemeId': {
      preLoaderRoute: typeof AppDiscoursemesDiscoursemeIdImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes/new': {
      preLoaderRoute: typeof AppDiscoursemesNewImport
      parentRoute: typeof AppImport
    }
    '/_app/queries/lazy': {
      preLoaderRoute: typeof AppQueriesLazyImport
      parentRoute: typeof AppQueriesImport
    }
    '/_app/queries/$queryId': {
      preLoaderRoute: typeof AppQueriesQueryIdImport
      parentRoute: typeof AppImport
    }
    '/_app/queries/new': {
      preLoaderRoute: typeof AppQueriesNewImport
      parentRoute: typeof AppImport
    }
    '/_app/subcorpora/new': {
      preLoaderRoute: typeof AppSubcorporaNewImport
      parentRoute: typeof AppImport
    }
    '/_app/queries/component/lazy': {
      preLoaderRoute: typeof AppQueriesComponentLazyImport
      parentRoute: typeof AppQueriesImport
    }
    '/_app/queries/errorComponent/lazy': {
      preLoaderRoute: typeof AppQueriesErrorComponentLazyImport
      parentRoute: typeof AppQueriesImport
    }
  }
}
export const routeTree = rootRoute.addChildren([
  IndexRoute,
  AppRoute.addChildren([
    AppQueriesRouteRoute,
    AppAdminRoute,
    AppCollocationAnalysisRoute,
    AppDiscoursemesRoute,
    AppKeywordAnalysisRoute,
    AppQueriesRoute.addChildren([
      AppQueriesLazyRoute,
      AppQueriesComponentLazyRoute,
      AppQueriesErrorComponentLazyRoute,
    ]),
    AppSubcorporaRoute,
    AppDiscoursemesDiscoursemeIdRoute,
    AppDiscoursemesNewRoute,
    AppQueriesQueryIdRoute,
    AppQueriesNewRoute,
    AppSubcorporaNewRoute,
  ]),
  LoginRoute,
  LogoutRoute,
  VignetteRoute,
])
