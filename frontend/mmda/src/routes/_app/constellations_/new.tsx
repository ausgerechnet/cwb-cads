import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/constellations_/new')({
  loader: () => {},
  validateSearch: z.object({
    defaultDiscoursemeIds: z.array(z.number()).optional().default([]),
  }),
})
