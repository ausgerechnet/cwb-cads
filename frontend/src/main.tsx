import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { router } from '@/router'
import { queryClient } from '@/rest-client'
import { createIDBPersister } from '@/rest-client/client'
import { ThemeProvider } from '@/components/theme-provider'

import './index.css'

const persister = createIDBPersister()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
