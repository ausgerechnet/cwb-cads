import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/constellations_/$constellationId/')(
  {
    component: () => (
      <Navigate to="./breakdown" from="/constellations/$constellationId/" />
    ),
  },
)
