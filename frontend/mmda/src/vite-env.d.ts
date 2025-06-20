/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ROUTER_BASEPATH: string
  readonly VITE_ENABLE_PERSISTENT_QUERIES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import '@tanstack/react-table' //or vue, svelte, solid, etc.

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
  }
}
