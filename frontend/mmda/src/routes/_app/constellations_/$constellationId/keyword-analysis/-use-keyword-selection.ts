import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { corpusById } from '@cads/shared/queries'
import { defaultValue } from '@cads/shared/lib/legal-default-value'

import { Route } from './route'

export const KeywordAnalysisSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
  layers: z.array(z.string()).optional(),

  focusDiscourseme: z.number().optional(),

  referenceCorpusId: z.number().optional(),
  referenceSubcorpusId: z.number().optional(),
  referenceLayer: z.string().optional(),
  referenceLayers: z.array(z.string()).optional(),
})

export function useKeywordSelection() {
  const navigate = useNavigate()
  const {
    corpusId,
    subcorpusId,
    focusDiscourseme,
    referenceCorpusId,
    referenceSubcorpusId,
  } = Route.useSearch()
  let { analysisLayer, referenceLayer } = Route.useSearch()

  const { data: { layers, structuredAttributes } = {}, error: errorLayers } =
    useQuery({
      ...corpusById(corpusId!, subcorpusId),
      select: (corpus) => ({
        layers: corpus.p_atts,
        structuredAttributes: corpus.s_atts,
      }),
      enabled: corpusId !== undefined,
    })

  const { data: referenceLayers, error: errorReferenceLayers } = useQuery({
    ...corpusById(referenceCorpusId!, referenceSubcorpusId),
    select: (corpus) => corpus.p_atts,
    enabled: referenceCorpusId !== undefined,
  })

  analysisLayer = defaultValue(layers, analysisLayer, 'lemma')
  referenceLayer = defaultValue(
    referenceLayers,
    referenceLayer,
    analysisLayer,
    'lemma',
  )

  return {
    errors: [errorLayers, errorReferenceLayers],
    analysisLayer,
    corpusId,
    subcorpusId,
    layers,
    structuredAttributes,
    referenceCorpusId,
    referenceSubcorpusId,
    focusDiscourseme,
    referenceLayer,
    referenceLayers,
    setAnalysisLayer: (layer: string) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, analysisLayer: layer }),
      }),
    setReferenceLayer: (layer: string) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, referenceLayer: layer }),
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
    setReferenceCorpus: (corpusId?: number, subcorpusId?: number) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({
          ...s,
          referenceCorpusId: corpusId,
          referenceSubcorpusId: subcorpusId,
          referenceLayer: undefined,
        }),
      }),
  }
}
