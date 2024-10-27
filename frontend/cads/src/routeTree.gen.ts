/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

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
import { Route as AppKeywordAnalysisRouteImport } from './routes/_app/keyword-analysis/route'
import { Route as AppDiscoursemesRouteImport } from './routes/_app/discoursemes/route'
import { Route as AppCorporaRouteImport } from './routes/_app/corpora/route'
import { Route as AppConstellationsRouteImport } from './routes/_app/constellations/route'
import { Route as AppSubcorporaNewImport } from './routes/_app/subcorpora_/new'
import { Route as AppSubcorporaSubcorpusIdImport } from './routes/_app/subcorpora_/$subcorpusId'
import { Route as AppQueriesNewImport } from './routes/_app/queries_/new'
import { Route as AppKeywordAnalysisNewImport } from './routes/_app/keyword-analysis_/new'
import { Route as AppKeywordAnalysisAnalysisIdImport } from './routes/_app/keyword-analysis_/$analysisId'
import { Route as AppDiscoursemesDiscoursemeIdImport } from './routes/_app/discoursemes_/$discoursemeId'
import { Route as AppCorporaCorpusIdImport } from './routes/_app/corpora_/$corpusId'
import { Route as AppConstellationsNewImport } from './routes/_app/constellations_/new'
import { Route as AppQueriesQueryIdRouteImport } from './routes/_app/queries_/$queryId/route'
import { Route as AppConstellationsConstellationIdRouteImport } from './routes/_app/constellations_/$constellationId/route'
import { Route as AppDiscoursemesDiscoursemeIdNewDescriptionImport } from './routes/_app/discoursemes_/$discoursemeId_/new-description'
import { Route as AppConstellationsConstellationIdSemanticMapImport } from './routes/_app/constellations_/$constellationId/semantic-map'

// Create Virtual Routes

const LogoutLazyImport = createFileRoute('/logout')()
const AppDiscoursemesNewLazyImport = createFileRoute(
  '/_app/discoursemes_/new',
)()

// Create/Update Routes

const LogoutLazyRoute = LogoutLazyImport.update({
  id: '/logout',
  path: '/logout',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/logout.lazy').then((d) => d.Route))

const VignetteRoute = VignetteImport.update({
  id: '/vignette',
  path: '/vignette',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/login.lazy').then((d) => d.Route))

const AppRoute = AppImport.update({
  id: '/_app',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/_app.lazy').then((d) => d.Route))

const Route = Import.update({
  id: '/*',
  path: '/*',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const AppAdminRoute = AppAdminImport.update({
  id: '/admin',
  path: '/admin',
  getParentRoute: () => AppRoute,
} as any)

const AppSubcorporaRouteRoute = AppSubcorporaRouteImport.update({
  id: '/subcorpora',
  path: '/subcorpora',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/subcorpora/route.lazy').then((d) => d.Route),
)

const AppQueriesRouteRoute = AppQueriesRouteImport.update({
  id: '/queries',
  path: '/queries',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/queries/route.lazy').then((d) => d.Route),
)

const AppKeywordAnalysisRouteRoute = AppKeywordAnalysisRouteImport.update({
  id: '/keyword-analysis',
  path: '/keyword-analysis',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/keyword-analysis/route.lazy').then((d) => d.Route),
)

const AppDiscoursemesRouteRoute = AppDiscoursemesRouteImport.update({
  id: '/discoursemes',
  path: '/discoursemes',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/discoursemes/route.lazy').then((d) => d.Route),
)

const AppCorporaRouteRoute = AppCorporaRouteImport.update({
  id: '/corpora',
  path: '/corpora',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/corpora/route.lazy').then((d) => d.Route),
)

const AppConstellationsRouteRoute = AppConstellationsRouteImport.update({
  id: '/constellations',
  path: '/constellations',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/constellations/route.lazy').then((d) => d.Route),
)

const AppDiscoursemesNewLazyRoute = AppDiscoursemesNewLazyImport.update({
  id: '/discoursemes_/new',
  path: '/discoursemes/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/discoursemes_/new.lazy').then((d) => d.Route),
)

const AppSubcorporaNewRoute = AppSubcorporaNewImport.update({
  id: '/subcorpora_/new',
  path: '/subcorpora/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/subcorpora_/new.lazy').then((d) => d.Route),
)

const AppSubcorporaSubcorpusIdRoute = AppSubcorporaSubcorpusIdImport.update({
  id: '/subcorpora_/$subcorpusId',
  path: '/subcorpora/$subcorpusId',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/subcorpora_/$subcorpusId.lazy').then((d) => d.Route),
)

const AppQueriesNewRoute = AppQueriesNewImport.update({
  id: '/queries_/new',
  path: '/queries/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/queries_/new.lazy').then((d) => d.Route),
)

const AppKeywordAnalysisNewRoute = AppKeywordAnalysisNewImport.update({
  id: '/keyword-analysis_/new',
  path: '/keyword-analysis/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/keyword-analysis_/new.lazy').then((d) => d.Route),
)

const AppKeywordAnalysisAnalysisIdRoute =
  AppKeywordAnalysisAnalysisIdImport.update({
    id: '/keyword-analysis_/$analysisId',
    path: '/keyword-analysis/$analysisId',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import('./routes/_app/keyword-analysis_/$analysisId.lazy').then(
      (d) => d.Route,
    ),
  )

const AppDiscoursemesDiscoursemeIdRoute =
  AppDiscoursemesDiscoursemeIdImport.update({
    id: '/discoursemes_/$discoursemeId',
    path: '/discoursemes/$discoursemeId',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import('./routes/_app/discoursemes_/$discoursemeId.lazy').then(
      (d) => d.Route,
    ),
  )

const AppCorporaCorpusIdRoute = AppCorporaCorpusIdImport.update({
  id: '/corpora_/$corpusId',
  path: '/corpora/$corpusId',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/corpora_/$corpusId.lazy').then((d) => d.Route),
)

const AppConstellationsNewRoute = AppConstellationsNewImport.update({
  id: '/constellations_/new',
  path: '/constellations/new',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/constellations_/new.lazy').then((d) => d.Route),
)

const AppQueriesQueryIdRouteRoute = AppQueriesQueryIdRouteImport.update({
  id: '/queries_/$queryId',
  path: '/queries/$queryId',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/queries_/$queryId/route.lazy').then((d) => d.Route),
)

const AppConstellationsConstellationIdRouteRoute =
  AppConstellationsConstellationIdRouteImport.update({
    id: '/constellations_/$constellationId',
    path: '/constellations/$constellationId',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import('./routes/_app/constellations_/$constellationId/route.lazy').then(
      (d) => d.Route,
    ),
  )

const AppDiscoursemesDiscoursemeIdNewDescriptionRoute =
  AppDiscoursemesDiscoursemeIdNewDescriptionImport.update({
    id: '/discoursemes_/$discoursemeId_/new-description',
    path: '/discoursemes/$discoursemeId/new-description',
    getParentRoute: () => AppRoute,
  } as any).lazy(() =>
    import(
      './routes/_app/discoursemes_/$discoursemeId_/new-description.lazy'
    ).then((d) => d.Route),
  )

const AppConstellationsConstellationIdSemanticMapRoute =
  AppConstellationsConstellationIdSemanticMapImport.update({
    id: '/semantic-map',
    path: '/semantic-map',
    getParentRoute: () => AppConstellationsConstellationIdRouteRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/*': {
      id: '/*'
      path: '/*'
      fullPath: '/*'
      preLoaderRoute: typeof Import
      parentRoute: typeof rootRoute
    }
    '/_app': {
      id: '/_app'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AppImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/vignette': {
      id: '/vignette'
      path: '/vignette'
      fullPath: '/vignette'
      preLoaderRoute: typeof VignetteImport
      parentRoute: typeof rootRoute
    }
    '/logout': {
      id: '/logout'
      path: '/logout'
      fullPath: '/logout'
      preLoaderRoute: typeof LogoutLazyImport
      parentRoute: typeof rootRoute
    }
    '/_app/constellations': {
      id: '/_app/constellations'
      path: '/constellations'
      fullPath: '/constellations'
      preLoaderRoute: typeof AppConstellationsRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/corpora': {
      id: '/_app/corpora'
      path: '/corpora'
      fullPath: '/corpora'
      preLoaderRoute: typeof AppCorporaRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes': {
      id: '/_app/discoursemes'
      path: '/discoursemes'
      fullPath: '/discoursemes'
      preLoaderRoute: typeof AppDiscoursemesRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/keyword-analysis': {
      id: '/_app/keyword-analysis'
      path: '/keyword-analysis'
      fullPath: '/keyword-analysis'
      preLoaderRoute: typeof AppKeywordAnalysisRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/queries': {
      id: '/_app/queries'
      path: '/queries'
      fullPath: '/queries'
      preLoaderRoute: typeof AppQueriesRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/subcorpora': {
      id: '/_app/subcorpora'
      path: '/subcorpora'
      fullPath: '/subcorpora'
      preLoaderRoute: typeof AppSubcorporaRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/admin': {
      id: '/_app/admin'
      path: '/admin'
      fullPath: '/admin'
      preLoaderRoute: typeof AppAdminImport
      parentRoute: typeof AppImport
    }
    '/_app/constellations_/$constellationId': {
      id: '/_app/constellations_/$constellationId'
      path: '/constellations/$constellationId'
      fullPath: '/constellations/$constellationId'
      preLoaderRoute: typeof AppConstellationsConstellationIdRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/queries_/$queryId': {
      id: '/_app/queries_/$queryId'
      path: '/queries/$queryId'
      fullPath: '/queries/$queryId'
      preLoaderRoute: typeof AppQueriesQueryIdRouteImport
      parentRoute: typeof AppImport
    }
    '/_app/constellations_/new': {
      id: '/_app/constellations_/new'
      path: '/constellations/new'
      fullPath: '/constellations/new'
      preLoaderRoute: typeof AppConstellationsNewImport
      parentRoute: typeof AppImport
    }
    '/_app/corpora_/$corpusId': {
      id: '/_app/corpora_/$corpusId'
      path: '/corpora/$corpusId'
      fullPath: '/corpora/$corpusId'
      preLoaderRoute: typeof AppCorporaCorpusIdImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes_/$discoursemeId': {
      id: '/_app/discoursemes_/$discoursemeId'
      path: '/discoursemes/$discoursemeId'
      fullPath: '/discoursemes/$discoursemeId'
      preLoaderRoute: typeof AppDiscoursemesDiscoursemeIdImport
      parentRoute: typeof AppImport
    }
    '/_app/keyword-analysis_/$analysisId': {
      id: '/_app/keyword-analysis_/$analysisId'
      path: '/keyword-analysis/$analysisId'
      fullPath: '/keyword-analysis/$analysisId'
      preLoaderRoute: typeof AppKeywordAnalysisAnalysisIdImport
      parentRoute: typeof AppImport
    }
    '/_app/keyword-analysis_/new': {
      id: '/_app/keyword-analysis_/new'
      path: '/keyword-analysis/new'
      fullPath: '/keyword-analysis/new'
      preLoaderRoute: typeof AppKeywordAnalysisNewImport
      parentRoute: typeof AppImport
    }
    '/_app/queries_/new': {
      id: '/_app/queries_/new'
      path: '/queries/new'
      fullPath: '/queries/new'
      preLoaderRoute: typeof AppQueriesNewImport
      parentRoute: typeof AppImport
    }
    '/_app/subcorpora_/$subcorpusId': {
      id: '/_app/subcorpora_/$subcorpusId'
      path: '/subcorpora/$subcorpusId'
      fullPath: '/subcorpora/$subcorpusId'
      preLoaderRoute: typeof AppSubcorporaSubcorpusIdImport
      parentRoute: typeof AppImport
    }
    '/_app/subcorpora_/new': {
      id: '/_app/subcorpora_/new'
      path: '/subcorpora/new'
      fullPath: '/subcorpora/new'
      preLoaderRoute: typeof AppSubcorporaNewImport
      parentRoute: typeof AppImport
    }
    '/_app/discoursemes_/new': {
      id: '/_app/discoursemes_/new'
      path: '/discoursemes/new'
      fullPath: '/discoursemes/new'
      preLoaderRoute: typeof AppDiscoursemesNewLazyImport
      parentRoute: typeof AppImport
    }
    '/_app/constellations_/$constellationId/semantic-map': {
      id: '/_app/constellations_/$constellationId/semantic-map'
      path: '/semantic-map'
      fullPath: '/constellations/$constellationId/semantic-map'
      preLoaderRoute: typeof AppConstellationsConstellationIdSemanticMapImport
      parentRoute: typeof AppConstellationsConstellationIdRouteImport
    }
    '/_app/discoursemes_/$discoursemeId_/new-description': {
      id: '/_app/discoursemes_/$discoursemeId_/new-description'
      path: '/discoursemes/$discoursemeId/new-description'
      fullPath: '/discoursemes/$discoursemeId/new-description'
      preLoaderRoute: typeof AppDiscoursemesDiscoursemeIdNewDescriptionImport
      parentRoute: typeof AppImport
    }
  }
}

// Create and export the route tree

interface AppConstellationsConstellationIdRouteRouteChildren {
  AppConstellationsConstellationIdSemanticMapRoute: typeof AppConstellationsConstellationIdSemanticMapRoute
}

const AppConstellationsConstellationIdRouteRouteChildren: AppConstellationsConstellationIdRouteRouteChildren =
  {
    AppConstellationsConstellationIdSemanticMapRoute:
      AppConstellationsConstellationIdSemanticMapRoute,
  }

const AppConstellationsConstellationIdRouteRouteWithChildren =
  AppConstellationsConstellationIdRouteRoute._addFileChildren(
    AppConstellationsConstellationIdRouteRouteChildren,
  )

interface AppRouteChildren {
  AppConstellationsRouteRoute: typeof AppConstellationsRouteRoute
  AppCorporaRouteRoute: typeof AppCorporaRouteRoute
  AppDiscoursemesRouteRoute: typeof AppDiscoursemesRouteRoute
  AppKeywordAnalysisRouteRoute: typeof AppKeywordAnalysisRouteRoute
  AppQueriesRouteRoute: typeof AppQueriesRouteRoute
  AppSubcorporaRouteRoute: typeof AppSubcorporaRouteRoute
  AppAdminRoute: typeof AppAdminRoute
  AppConstellationsConstellationIdRouteRoute: typeof AppConstellationsConstellationIdRouteRouteWithChildren
  AppQueriesQueryIdRouteRoute: typeof AppQueriesQueryIdRouteRoute
  AppConstellationsNewRoute: typeof AppConstellationsNewRoute
  AppCorporaCorpusIdRoute: typeof AppCorporaCorpusIdRoute
  AppDiscoursemesDiscoursemeIdRoute: typeof AppDiscoursemesDiscoursemeIdRoute
  AppKeywordAnalysisAnalysisIdRoute: typeof AppKeywordAnalysisAnalysisIdRoute
  AppKeywordAnalysisNewRoute: typeof AppKeywordAnalysisNewRoute
  AppQueriesNewRoute: typeof AppQueriesNewRoute
  AppSubcorporaSubcorpusIdRoute: typeof AppSubcorporaSubcorpusIdRoute
  AppSubcorporaNewRoute: typeof AppSubcorporaNewRoute
  AppDiscoursemesNewLazyRoute: typeof AppDiscoursemesNewLazyRoute
  AppDiscoursemesDiscoursemeIdNewDescriptionRoute: typeof AppDiscoursemesDiscoursemeIdNewDescriptionRoute
}

const AppRouteChildren: AppRouteChildren = {
  AppConstellationsRouteRoute: AppConstellationsRouteRoute,
  AppCorporaRouteRoute: AppCorporaRouteRoute,
  AppDiscoursemesRouteRoute: AppDiscoursemesRouteRoute,
  AppKeywordAnalysisRouteRoute: AppKeywordAnalysisRouteRoute,
  AppQueriesRouteRoute: AppQueriesRouteRoute,
  AppSubcorporaRouteRoute: AppSubcorporaRouteRoute,
  AppAdminRoute: AppAdminRoute,
  AppConstellationsConstellationIdRouteRoute:
    AppConstellationsConstellationIdRouteRouteWithChildren,
  AppQueriesQueryIdRouteRoute: AppQueriesQueryIdRouteRoute,
  AppConstellationsNewRoute: AppConstellationsNewRoute,
  AppCorporaCorpusIdRoute: AppCorporaCorpusIdRoute,
  AppDiscoursemesDiscoursemeIdRoute: AppDiscoursemesDiscoursemeIdRoute,
  AppKeywordAnalysisAnalysisIdRoute: AppKeywordAnalysisAnalysisIdRoute,
  AppKeywordAnalysisNewRoute: AppKeywordAnalysisNewRoute,
  AppQueriesNewRoute: AppQueriesNewRoute,
  AppSubcorporaSubcorpusIdRoute: AppSubcorporaSubcorpusIdRoute,
  AppSubcorporaNewRoute: AppSubcorporaNewRoute,
  AppDiscoursemesNewLazyRoute: AppDiscoursemesNewLazyRoute,
  AppDiscoursemesDiscoursemeIdNewDescriptionRoute:
    AppDiscoursemesDiscoursemeIdNewDescriptionRoute,
}

const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/*': typeof Route
  '': typeof AppRouteWithChildren
  '/login': typeof LoginRoute
  '/vignette': typeof VignetteRoute
  '/logout': typeof LogoutLazyRoute
  '/constellations': typeof AppConstellationsRouteRoute
  '/corpora': typeof AppCorporaRouteRoute
  '/discoursemes': typeof AppDiscoursemesRouteRoute
  '/keyword-analysis': typeof AppKeywordAnalysisRouteRoute
  '/queries': typeof AppQueriesRouteRoute
  '/subcorpora': typeof AppSubcorporaRouteRoute
  '/admin': typeof AppAdminRoute
  '/constellations/$constellationId': typeof AppConstellationsConstellationIdRouteRouteWithChildren
  '/queries/$queryId': typeof AppQueriesQueryIdRouteRoute
  '/constellations/new': typeof AppConstellationsNewRoute
  '/corpora/$corpusId': typeof AppCorporaCorpusIdRoute
  '/discoursemes/$discoursemeId': typeof AppDiscoursemesDiscoursemeIdRoute
  '/keyword-analysis/$analysisId': typeof AppKeywordAnalysisAnalysisIdRoute
  '/keyword-analysis/new': typeof AppKeywordAnalysisNewRoute
  '/queries/new': typeof AppQueriesNewRoute
  '/subcorpora/$subcorpusId': typeof AppSubcorporaSubcorpusIdRoute
  '/subcorpora/new': typeof AppSubcorporaNewRoute
  '/discoursemes/new': typeof AppDiscoursemesNewLazyRoute
  '/constellations/$constellationId/semantic-map': typeof AppConstellationsConstellationIdSemanticMapRoute
  '/discoursemes/$discoursemeId/new-description': typeof AppDiscoursemesDiscoursemeIdNewDescriptionRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/*': typeof Route
  '': typeof AppRouteWithChildren
  '/login': typeof LoginRoute
  '/vignette': typeof VignetteRoute
  '/logout': typeof LogoutLazyRoute
  '/constellations': typeof AppConstellationsRouteRoute
  '/corpora': typeof AppCorporaRouteRoute
  '/discoursemes': typeof AppDiscoursemesRouteRoute
  '/keyword-analysis': typeof AppKeywordAnalysisRouteRoute
  '/queries': typeof AppQueriesRouteRoute
  '/subcorpora': typeof AppSubcorporaRouteRoute
  '/admin': typeof AppAdminRoute
  '/constellations/$constellationId': typeof AppConstellationsConstellationIdRouteRouteWithChildren
  '/queries/$queryId': typeof AppQueriesQueryIdRouteRoute
  '/constellations/new': typeof AppConstellationsNewRoute
  '/corpora/$corpusId': typeof AppCorporaCorpusIdRoute
  '/discoursemes/$discoursemeId': typeof AppDiscoursemesDiscoursemeIdRoute
  '/keyword-analysis/$analysisId': typeof AppKeywordAnalysisAnalysisIdRoute
  '/keyword-analysis/new': typeof AppKeywordAnalysisNewRoute
  '/queries/new': typeof AppQueriesNewRoute
  '/subcorpora/$subcorpusId': typeof AppSubcorporaSubcorpusIdRoute
  '/subcorpora/new': typeof AppSubcorporaNewRoute
  '/discoursemes/new': typeof AppDiscoursemesNewLazyRoute
  '/constellations/$constellationId/semantic-map': typeof AppConstellationsConstellationIdSemanticMapRoute
  '/discoursemes/$discoursemeId/new-description': typeof AppDiscoursemesDiscoursemeIdNewDescriptionRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/*': typeof Route
  '/_app': typeof AppRouteWithChildren
  '/login': typeof LoginRoute
  '/vignette': typeof VignetteRoute
  '/logout': typeof LogoutLazyRoute
  '/_app/constellations': typeof AppConstellationsRouteRoute
  '/_app/corpora': typeof AppCorporaRouteRoute
  '/_app/discoursemes': typeof AppDiscoursemesRouteRoute
  '/_app/keyword-analysis': typeof AppKeywordAnalysisRouteRoute
  '/_app/queries': typeof AppQueriesRouteRoute
  '/_app/subcorpora': typeof AppSubcorporaRouteRoute
  '/_app/admin': typeof AppAdminRoute
  '/_app/constellations_/$constellationId': typeof AppConstellationsConstellationIdRouteRouteWithChildren
  '/_app/queries_/$queryId': typeof AppQueriesQueryIdRouteRoute
  '/_app/constellations_/new': typeof AppConstellationsNewRoute
  '/_app/corpora_/$corpusId': typeof AppCorporaCorpusIdRoute
  '/_app/discoursemes_/$discoursemeId': typeof AppDiscoursemesDiscoursemeIdRoute
  '/_app/keyword-analysis_/$analysisId': typeof AppKeywordAnalysisAnalysisIdRoute
  '/_app/keyword-analysis_/new': typeof AppKeywordAnalysisNewRoute
  '/_app/queries_/new': typeof AppQueriesNewRoute
  '/_app/subcorpora_/$subcorpusId': typeof AppSubcorporaSubcorpusIdRoute
  '/_app/subcorpora_/new': typeof AppSubcorporaNewRoute
  '/_app/discoursemes_/new': typeof AppDiscoursemesNewLazyRoute
  '/_app/constellations_/$constellationId/semantic-map': typeof AppConstellationsConstellationIdSemanticMapRoute
  '/_app/discoursemes_/$discoursemeId_/new-description': typeof AppDiscoursemesDiscoursemeIdNewDescriptionRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/*'
    | ''
    | '/login'
    | '/vignette'
    | '/logout'
    | '/constellations'
    | '/corpora'
    | '/discoursemes'
    | '/keyword-analysis'
    | '/queries'
    | '/subcorpora'
    | '/admin'
    | '/constellations/$constellationId'
    | '/queries/$queryId'
    | '/constellations/new'
    | '/corpora/$corpusId'
    | '/discoursemes/$discoursemeId'
    | '/keyword-analysis/$analysisId'
    | '/keyword-analysis/new'
    | '/queries/new'
    | '/subcorpora/$subcorpusId'
    | '/subcorpora/new'
    | '/discoursemes/new'
    | '/constellations/$constellationId/semantic-map'
    | '/discoursemes/$discoursemeId/new-description'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/*'
    | ''
    | '/login'
    | '/vignette'
    | '/logout'
    | '/constellations'
    | '/corpora'
    | '/discoursemes'
    | '/keyword-analysis'
    | '/queries'
    | '/subcorpora'
    | '/admin'
    | '/constellations/$constellationId'
    | '/queries/$queryId'
    | '/constellations/new'
    | '/corpora/$corpusId'
    | '/discoursemes/$discoursemeId'
    | '/keyword-analysis/$analysisId'
    | '/keyword-analysis/new'
    | '/queries/new'
    | '/subcorpora/$subcorpusId'
    | '/subcorpora/new'
    | '/discoursemes/new'
    | '/constellations/$constellationId/semantic-map'
    | '/discoursemes/$discoursemeId/new-description'
  id:
    | '__root__'
    | '/'
    | '/*'
    | '/_app'
    | '/login'
    | '/vignette'
    | '/logout'
    | '/_app/constellations'
    | '/_app/corpora'
    | '/_app/discoursemes'
    | '/_app/keyword-analysis'
    | '/_app/queries'
    | '/_app/subcorpora'
    | '/_app/admin'
    | '/_app/constellations_/$constellationId'
    | '/_app/queries_/$queryId'
    | '/_app/constellations_/new'
    | '/_app/corpora_/$corpusId'
    | '/_app/discoursemes_/$discoursemeId'
    | '/_app/keyword-analysis_/$analysisId'
    | '/_app/keyword-analysis_/new'
    | '/_app/queries_/new'
    | '/_app/subcorpora_/$subcorpusId'
    | '/_app/subcorpora_/new'
    | '/_app/discoursemes_/new'
    | '/_app/constellations_/$constellationId/semantic-map'
    | '/_app/discoursemes_/$discoursemeId_/new-description'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  Route: typeof Route
  AppRoute: typeof AppRouteWithChildren
  LoginRoute: typeof LoginRoute
  VignetteRoute: typeof VignetteRoute
  LogoutLazyRoute: typeof LogoutLazyRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  Route: Route,
  AppRoute: AppRouteWithChildren,
  LoginRoute: LoginRoute,
  VignetteRoute: VignetteRoute,
  LogoutLazyRoute: LogoutLazyRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/*",
        "/_app",
        "/login",
        "/vignette",
        "/logout"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/*": {
      "filePath": "*.tsx"
    },
    "/_app": {
      "filePath": "_app.tsx",
      "children": [
        "/_app/constellations",
        "/_app/corpora",
        "/_app/discoursemes",
        "/_app/keyword-analysis",
        "/_app/queries",
        "/_app/subcorpora",
        "/_app/admin",
        "/_app/constellations_/$constellationId",
        "/_app/queries_/$queryId",
        "/_app/constellations_/new",
        "/_app/corpora_/$corpusId",
        "/_app/discoursemes_/$discoursemeId",
        "/_app/keyword-analysis_/$analysisId",
        "/_app/keyword-analysis_/new",
        "/_app/queries_/new",
        "/_app/subcorpora_/$subcorpusId",
        "/_app/subcorpora_/new",
        "/_app/discoursemes_/new",
        "/_app/discoursemes_/$discoursemeId_/new-description"
      ]
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/vignette": {
      "filePath": "vignette.tsx"
    },
    "/logout": {
      "filePath": "logout.lazy.tsx"
    },
    "/_app/constellations": {
      "filePath": "_app/constellations/route.tsx",
      "parent": "/_app"
    },
    "/_app/corpora": {
      "filePath": "_app/corpora/route.tsx",
      "parent": "/_app"
    },
    "/_app/discoursemes": {
      "filePath": "_app/discoursemes/route.tsx",
      "parent": "/_app"
    },
    "/_app/keyword-analysis": {
      "filePath": "_app/keyword-analysis/route.tsx",
      "parent": "/_app"
    },
    "/_app/queries": {
      "filePath": "_app/queries/route.tsx",
      "parent": "/_app"
    },
    "/_app/subcorpora": {
      "filePath": "_app/subcorpora/route.tsx",
      "parent": "/_app"
    },
    "/_app/admin": {
      "filePath": "_app/admin.tsx",
      "parent": "/_app"
    },
    "/_app/constellations_/$constellationId": {
      "filePath": "_app/constellations_/$constellationId/route.tsx",
      "parent": "/_app",
      "children": [
        "/_app/constellations_/$constellationId/semantic-map"
      ]
    },
    "/_app/queries_/$queryId": {
      "filePath": "_app/queries_/$queryId/route.tsx",
      "parent": "/_app"
    },
    "/_app/constellations_/new": {
      "filePath": "_app/constellations_/new.tsx",
      "parent": "/_app"
    },
    "/_app/corpora_/$corpusId": {
      "filePath": "_app/corpora_/$corpusId.tsx",
      "parent": "/_app"
    },
    "/_app/discoursemes_/$discoursemeId": {
      "filePath": "_app/discoursemes_/$discoursemeId.tsx",
      "parent": "/_app"
    },
    "/_app/keyword-analysis_/$analysisId": {
      "filePath": "_app/keyword-analysis_/$analysisId.tsx",
      "parent": "/_app"
    },
    "/_app/keyword-analysis_/new": {
      "filePath": "_app/keyword-analysis_/new.tsx",
      "parent": "/_app"
    },
    "/_app/queries_/new": {
      "filePath": "_app/queries_/new.tsx",
      "parent": "/_app"
    },
    "/_app/subcorpora_/$subcorpusId": {
      "filePath": "_app/subcorpora_/$subcorpusId.tsx",
      "parent": "/_app"
    },
    "/_app/subcorpora_/new": {
      "filePath": "_app/subcorpora_/new.tsx",
      "parent": "/_app"
    },
    "/_app/discoursemes_/new": {
      "filePath": "_app/discoursemes_/new.lazy.tsx",
      "parent": "/_app"
    },
    "/_app/constellations_/$constellationId/semantic-map": {
      "filePath": "_app/constellations_/$constellationId/semantic-map.tsx",
      "parent": "/_app/constellations_/$constellationId"
    },
    "/_app/discoursemes_/$discoursemeId_/new-description": {
      "filePath": "_app/discoursemes_/$discoursemeId_/new-description.tsx",
      "parent": "/_app"
    }
  }
}
ROUTE_MANIFEST_END */
