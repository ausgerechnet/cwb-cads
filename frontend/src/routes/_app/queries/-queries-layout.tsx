import { ReactNode } from 'react'
import { AppPageFrame } from '@/components/app-page-frame'

export function QueriesLayout({ children }: { children: ReactNode }) {
  return (
    <AppPageFrame
      title="Queries"
      cta={{
        nav: { to: '/queries/new' },
        label: 'New Query',
      }}
    >
      {children}
    </AppPageFrame>
  )
}
