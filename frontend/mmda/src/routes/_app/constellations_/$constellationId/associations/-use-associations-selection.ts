import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { corpusById } from '@cads/shared/queries'

import { Route } from './route'

export const AssociationsSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
})

export function useAssociationsSelection() {
  const navigate = useNavigate()
  const { corpusId, subcorpusId, analysisLayer } = Route.useSearch()

  const { data: { layers, structuredAttributes } = {}, error: errorLayers } =
    useQuery({
      ...corpusById(corpusId!, subcorpusId),
      select: (corpus) => ({
        layers: corpus.p_atts,
        structuredAttributes: corpus.s_atts,
      }),
      enabled: corpusId !== undefined,
    })

  return {
    errors: [errorLayers],
    analysisLayer,
    corpusId,
    subcorpusId,
    layers,
    structuredAttributes,
    setAnalysisLayer: (layer: string) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, analysisLayer: layer }),
      }),
    setCorpus: (corpusId?: number, subcorpusId?: number) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({
          ...s,
          corpusId,
          subcorpusId,
          analysisLayer: undefined,
          focusDiscourseme: undefined,
          contextBreak: undefined,
        }),
      }),
  }
}
