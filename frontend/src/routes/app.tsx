import { FileRoute, Outlet } from '@tanstack/react-router'

export const Route = new FileRoute('/app').createRoute({
  component: Outlet,
})
