import { ReactNode } from 'react'
import { AppPageFrame } from '@/components/app-page-frame'

export function KeywordAnalysisLayout({ children }: { children: ReactNode }) {
  return (
    <AppPageFrame
      title="Keyword Analysis"
      cta={{
        nav: { to: '/keyword-analysis/new' },
        label: 'New Keyword Analyses',
      }}
    >
      {children}
    </AppPageFrame>
  )
}
