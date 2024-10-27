import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'

import { queryClient } from '@/lib/query-client'
import { router } from '@/lib/router'
import { createIDBPersister } from '@/rest-client/client'
import { ThemeProvider } from '@/components/theme-provider'

import '../../shared/index.css'

const persister = createIDBPersister()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: '1' }}
    >
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
