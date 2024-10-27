import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export function DevTools() {
  return (
    <>
      <ReactQueryDevtools buttonPosition="bottom-right" />
      <TanStackRouterDevtools
        position="bottom-right"
        toggleButtonProps={{ style: { bottom: 70 } }}
      />
    </>
  )
}
