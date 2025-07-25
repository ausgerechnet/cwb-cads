/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { createFileRoute } from '@tanstack/react-router'

import { Route as rootRouteImport } from './routes/__root'
import { Route as LoginRouteImport } from './routes/login'
import { Route as AppRouteImport } from './routes/_app'
import { Route as Char42RouteImport } from './routes/*'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AppStartRouteRouteImport } from './routes/_app/start/route'

const LogoutLazyRouteImport = createFileRoute('/logout')()

const LogoutLazyRoute = LogoutLazyRouteImport.update({
  id: '/logout',
  path: '/logout',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/logout.lazy').then((d) => d.Route))
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/login.lazy').then((d) => d.Route))
const AppRoute = AppRouteImport.update({
  id: '/_app',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/_app.lazy').then((d) => d.Route))
const Char42Route = Char42RouteImport.update({
  id: '/*',
  path: '/*',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AppStartRouteRoute = AppStartRouteRouteImport.update({
  id: '/start',
  path: '/start',
  getParentRoute: () => AppRoute,
} as any).lazy(() =>
  import('./routes/_app/start/route.lazy').then((d) => d.Route),
)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/*': typeof Char42Route
  '/login': typeof LoginRoute
  '/logout': typeof LogoutLazyRoute
  '/start': typeof AppStartRouteRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/*': typeof Char42Route
  '/login': typeof LoginRoute
  '/logout': typeof LogoutLazyRoute
  '/start': typeof AppStartRouteRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/*': typeof Char42Route
  '/_app': typeof AppRouteWithChildren
  '/login': typeof LoginRoute
  '/logout': typeof LogoutLazyRoute
  '/_app/start': typeof AppStartRouteRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/*' | '/login' | '/logout' | '/start'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/*' | '/login' | '/logout' | '/start'
  id: '__root__' | '/' | '/*' | '/_app' | '/login' | '/logout' | '/_app/start'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  Char42Route: typeof Char42Route
  AppRoute: typeof AppRouteWithChildren
  LoginRoute: typeof LoginRoute
  LogoutLazyRoute: typeof LogoutLazyRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/logout': {
      id: '/logout'
      path: '/logout'
      fullPath: '/logout'
      preLoaderRoute: typeof LogoutLazyRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_app': {
      id: '/_app'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AppRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/*': {
      id: '/*'
      path: '/*'
      fullPath: '/*'
      preLoaderRoute: typeof Char42RouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_app/start': {
      id: '/_app/start'
      path: '/start'
      fullPath: '/start'
      preLoaderRoute: typeof AppStartRouteRouteImport
      parentRoute: typeof AppRoute
    }
  }
}

interface AppRouteChildren {
  AppStartRouteRoute: typeof AppStartRouteRoute
}

const AppRouteChildren: AppRouteChildren = {
  AppStartRouteRoute: AppStartRouteRoute,
}

const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  Char42Route: Char42Route,
  AppRoute: AppRouteWithChildren,
  LoginRoute: LoginRoute,
  LogoutLazyRoute: LogoutLazyRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
