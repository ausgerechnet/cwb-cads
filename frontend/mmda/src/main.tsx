import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'

import { ThemeProvider } from '@cads/shared/components/theme-provider'
import { router } from './router'
import { QueryProvider } from './query-provider'

import './rest-client'
import '@cads/shared/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider
      isPersistent={import.meta.env.VITE_ENABLE_PERSISTENT_QUERIES === 'true'}
    >
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>,
)
