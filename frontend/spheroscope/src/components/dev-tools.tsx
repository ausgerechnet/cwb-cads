import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export function DevTools() {
  return (
    <>
      <ReactQueryDevtools buttonPosition="bottom-right" />
      <TanStackRouterDevtools position="top-left" />
    </>
  )
}
