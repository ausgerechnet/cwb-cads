import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { corpusById } from '@cads/shared/queries'
import { defaultValue } from '@cads/shared/lib/legal-default-value'

import { Route } from './route'

export const BreakdownAnalysisSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
})

export function useBreakdownSelection() {
  const navigate = Route.useNavigate()
  const { corpusId, subcorpusId } = Route.useSearch()
  let { analysisLayer } = Route.useSearch()

  const { data: { layers, structuredAttributes } = {}, error: errorLayers } =
    useQuery({
      ...corpusById(corpusId!, subcorpusId),
      select: (corpus) => ({
        layers: corpus.p_atts,
        structuredAttributes: corpus.s_atts,
      }),
      enabled: corpusId !== undefined,
    })

  analysisLayer = defaultValue(layers, analysisLayer, 'lemma')

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
        replace: true,
        params: (p) => p,
        search: (s) => ({ ...s, analysisLayer: layer }),
      }),
    setCorpus: (corpusId?: number, subcorpusId?: number) =>
      navigate({
        to: '.',
        replace: true,
        params: (p) => p,
        search: (s) => ({
          ...s,
          corpusId,
          subcorpusId,
        }),
      }),
  }
}
