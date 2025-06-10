import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { corpusById } from '@cads/shared/queries'
import { defaultValue } from '@cads/shared/lib/legal-default-value'

import { Route } from './route'

export const CollocationSelectionSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
  focusDiscourseme: z.number().optional(),
  contextBreak: z.string().optional(),
})

export function useCollocationSelection() {
  const navigate = useNavigate()
  const { corpusId, subcorpusId, focusDiscourseme } = Route.useSearch()
  let { analysisLayer, contextBreak } = Route.useSearch()

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
  contextBreak = defaultValue(structuredAttributes, contextBreak)

  const isValidSelection =
    corpusId !== undefined &&
    focusDiscourseme !== undefined &&
    analysisLayer !== undefined &&
    contextBreak !== undefined

  return {
    errors: errorLayers,
    isValidSelection,
    analysisLayer,
    corpusId,
    subcorpusId,
    layers,
    structuredAttributes,
    focusDiscourseme,
    contextBreak,
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
    setFocusDiscourseme: (focusDiscourseme?: number) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, focusDiscourseme }),
      }),
    setContextBreak: (contextBreak?: string) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, contextBreak }),
      }),
  }
}
