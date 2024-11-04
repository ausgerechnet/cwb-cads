import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'

const PageComponent =
  process.env.NODE_ENV === 'production'
    ? () => {
        const nav = useNavigate()
        useEffect(() => {
          nav({ to: '/' })
        }, [nav])
        return null
      }
    : lazy(() =>
        import('@/components/component-overview').then((res) => ({
          default: res.ComponentOverview,
        })),
      )

export const Route = createFileRoute('/components_')({
  component: () => (
    <Suspense>
      <PageComponent />
    </Suspense>
  ),
})
