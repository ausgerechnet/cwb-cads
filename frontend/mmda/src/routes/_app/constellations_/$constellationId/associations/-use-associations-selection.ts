import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { Route } from './route'

export const AssociationsSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
})

export function useAssociationsSelection() {
  const navigate = useNavigate()
  const { corpusId, subcorpusId } = Route.useSearch()

  const isSelectionValid = corpusId !== undefined

  return {
    isSelectionValid,
    corpusId,
    subcorpusId,
    setCorpus: (corpusId?: number, subcorpusId?: number) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({
          ...s,
          corpusId,
          subcorpusId,
        }),
      }),
  }
}
