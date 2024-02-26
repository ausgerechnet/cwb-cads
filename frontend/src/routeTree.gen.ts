// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as VignetteImport } from './routes/vignette'
import { Route as LoginImport } from './routes/login'
import { Route as AppImport } from './routes/_app'
import { Route as Import } from './routes/*'
import { Route as IndexImport } from './routes/index'
import { Route as AppAdminImport } from './routes/_app/admin'
import { Route as AppSubcorporaRouteImport } from './routes/_app/subcorpora/route'
import { Route as AppQueriesRouteImport } from './routes/_app/queries/route'
import { Route as AppDiscoursemesRouteImport } from './routes/_app/discoursemes/route'
import { Route as AppConstellationsRouteImport } from './routes/_app/constellations/route'
import { Route as AppCollocationAnalysisRouteImport } from './routes/_app/collocation-analysis/route'
import { Route as AppSubcorporaNewImport } from './routes/_app/subcorpora_/new'
import { Route as AppQueriesNewImport } from './routes/_app/queries_/new'
import { Route as AppQueriesQueryIdImport } from './routes/_app/queries_/$queryId'
import { Route as AppDiscoursemesDiscoursemeIdImport } from './routes/_app/discoursemes_/$discoursemeId'
import { Route as AppConstellationsNewImport } from './routes/_app/constellations_/new'
import { Route as AppConstellationsConstellationIdImport } from './routes/_app/constellations_/$constellationId'
import { Route as AppCollocationAnalysisNewImport } from './routes/_app/collocation-analysis_/new'

// Create Virtual Routes

const LogoutLazyImport = createFileRoute('/logout')()
const AppKeywordAnalysisLazyImport = createFileRoute('/_app/keyword-analysis')()
const AppDiscoursemesNewLazyImport = createFileRoute('/_app/discoursemes/new')()
const AppCollocationAnalysisCollocationIdLazyImport = createFileRoute(
  '/_app/collocation-analysis/$collocationId',
)()

// Create/Update Routes

const LogoutLazyRoute = LogoutLazyImport.update({
  path: '/logout',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/logout.lazy').then((d) => d.Route))

const VignetteRoute = VignetteImport.update({
  path: '/vignette',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/login.lazy').then((d) => d.Route))

const AppRoute = AppImport.update({
  id: '/_app',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/_app.lazy').then((d) => d.Route))

const Route = Import.update({
  path: '/*',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AppKeywordAnalysisLazyRoute = AppKeywordAnalysisLazyImport.update({
  path: '/keyword-analysis',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/keyword-analysis.lazy').then((d) => d.Route),
)

const AppAdminRoute = AppAdminImport.update({
  path: '/admin',
  getParentRoute: () => AppRoute,
} as any)

const AppSubcorporaRouteRoute = AppSubcorporaRouteImport.update({
  path: '/subcorpora',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/subcorpora/route.lazy').then((d) => d.Route),
)

const AppQueriesRouteRoute = AppQueriesRouteImport.update({
  path: '/queries',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/queries/route.lazy').then((d) => d.Route),
)

const AppDiscoursemesRouteRoute = AppDiscoursemesRouteImport.update({
  path: '/discoursemes',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/discoursemes/route.lazy').then((d) => d.Route),
)

const AppConstellationsRouteRoute = AppConstellationsRouteImport.update({
  path: '/constellations',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/constellations/route.lazy').then((d) => d.Route),
)

const AppCollocationAnalysisRouteRoute =
  AppCollocationAnalysisRouteImport.update({
    path: '/collocation-analysis',
    getParentRoute: () => AppRoute,
  } as any)

const AppDiscoursemesNewLazyRoute = AppDiscoursemesNewLazyImport.update({
  path: '/discoursemes/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/discoursemes_/new.lazy').then((d) => d.Route),
)

const AppCollocationAnalysisCollocationIdLazyRoute =
  AppCollocationAnalysisCollocationIdLazyImport.update({
    path: '/collocation-analysis/$collocationId',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import('./routes/_app/collocation-analysis_/$collocationId.lazy').then(
      (d) => d.Route,
    ),
  )

const AppSubcorporaNewRoute = AppSubcorporaNewImport.update({
  path: '/subcorpora/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/subcorpora_/new.lazy').then((d) => d.Route),
)

const AppQueriesNewRoute = AppQueriesNewImport.update({
  path: '/queries/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/queries_/new.lazy').then((d) => d.Route),
)

const AppQueriesQueryIdRoute = AppQueriesQueryIdImport.update({
  path: '/queries/$queryId',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/queries_/$queryId.lazy').then((d) => d.Route),
)

const AppDiscoursemesDiscoursemeIdRoute =
  AppDiscoursemesDiscoursemeIdImport.update({
    path: '/discoursemes/$discoursemeId',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import('./routes/_app/discoursemes_/$discoursemeId.lazy').then(
      (d) => d.Route,
    ),
  )

const AppConstellationsNewRoute = AppConstellationsNewImport.update({
  path: '/constellations/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/constellations_/new.lazy').then((d) => d.Route),
)

const AppConstellationsConstellationIdRoute =
  AppConstellationsConstellationIdImport.update({
    path: '/constellations/$constellationId',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import('./routes/_app/constellations_/$constellationId.lazy').then(
      (d) => d.Route,
    ),
  )

const AppCollocationAnalysisNewRoute = AppCollocationAnalysisNewImport.update({
  path: '/collocation-analysis/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/collocation-analysis_/new.lazy').then((d) => d.Route),
)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/*': {
      preLoaderRoute: typeof Import
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
    '/vignette': {
      preLoaderRoute: typeof VignetteImport
      parentRoute: typeof rootRoute
    }
    '/logout': {
      preLoaderRoute: typeof LogoutLazyImport
      parentRoute: typeof rootRoute
    }
    '/_app/collocation-analysis': {
      preLoaderRoute: typeof AppCollocationAnalysisRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/constellations': {
      preLoaderRoute: typeof AppConstellationsRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes': {
      preLoaderRoute: typeof AppDiscoursemesRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/queries': {
      preLoaderRoute: typeof AppQueriesRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/subcorpora': {
      preLoaderRoute: typeof AppSubcorporaRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/admin': {
      preLoaderRoute: typeof AppAdminImport
      parentRoute: typeof AppImport
    }
    '/_app/keyword-analysis': {
      preLoaderRoute: typeof AppKeywordAnalysisLazyImport
      parentRoute: typeof AppImport
    }
    '/_app/collocation-analysis/new': {
      preLoaderRoute: typeof AppCollocationAnalysisNewImport
      parentRoute: typeof AppImport
    }
    '/_app/constellations/$constellationId': {
      preLoaderRoute: typeof AppConstellationsConstellationIdImport
      parentRoute: typeof AppImport
    }
    '/_app/constellations/new': {
      preLoaderRoute: typeof AppConstellationsNewImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes/$discoursemeId': {
      preLoaderRoute: typeof AppDiscoursemesDiscoursemeIdImport
      parentRoute: typeof AppImport
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
    '/_app/collocation-analysis/$collocationId': {
      preLoaderRoute: typeof AppCollocationAnalysisCollocationIdLazyImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes/new': {
      preLoaderRoute: typeof AppDiscoursemesNewLazyImport
      parentRoute: typeof AppImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  Route,
  AppRoute.addChildren([
    AppCollocationAnalysisRouteRoute,
    AppConstellationsRouteRoute,
    AppDiscoursemesRouteRoute,
    AppQueriesRouteRoute,
    AppSubcorporaRouteRoute,
    AppAdminRoute,
    AppKeywordAnalysisLazyRoute,
    AppCollocationAnalysisNewRoute,
    AppConstellationsConstellationIdRoute,
    AppConstellationsNewRoute,
    AppDiscoursemesDiscoursemeIdRoute,
    AppQueriesQueryIdRoute,
    AppQueriesNewRoute,
    AppSubcorporaNewRoute,
    AppCollocationAnalysisCollocationIdLazyRoute,
    AppDiscoursemesNewLazyRoute,
  ]),
  LoginRoute,
  VignetteRoute,
  LogoutLazyRoute,
])
