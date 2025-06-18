import { useState } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { QueryClientProvider } from '@tanstack/react-query'

import { createIDBPersister } from '@/rest-client'
import { queryClient } from '@cads/shared/queries'

export function QueryProvider({
  children,
  isPersistent = false,
}: {
  children: React.ReactNode
  isPersistent?: boolean
}) {
  if (isPersistent) {
    console.log('Using persistent queries')
    return <QueryProviderPersistent>{children}</QueryProviderPersistent>
  }
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function QueryProviderPersistent({ children }: { children: React.ReactNode }) {
  const [persister] = useState(() => createIDBPersister())
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: '1' }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
