import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { Route } from './route'
import { corpusById } from '@cads/shared/queries'

export const AssociationsSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
  contexBreak: z.string().optional(),
})

export function useAssociationsSelection() {
  const navigate = useNavigate()
  const { corpusId, subcorpusId, contextBreak } = Route.useSearch()
  const { data: corpus } = useQuery({
    ...corpusById(corpusId!, subcorpusId),
    enabled: corpusId !== undefined,
  })
  const contextBreakList = corpus?.s_atts ?? []

  const isSelectionValid = corpusId !== undefined && contextBreak !== undefined

  return {
    isSelectionValid,
    corpusId,
    subcorpusId,
    contextBreak,
    contextBreakList,
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
    setContextBreak: (contextBreak?: string) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({
          ...s,
          contextBreak,
        }),
      }),
  }
}
