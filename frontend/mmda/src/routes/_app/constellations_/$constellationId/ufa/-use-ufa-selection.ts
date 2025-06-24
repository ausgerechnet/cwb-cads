import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { corpusById, subcorpusCollections } from '@cads/shared/queries'
import { defaultValue } from '@cads/shared/lib/legal-default-value'

import { Route } from './route'

export const UfaAnalysisSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
  layers: z.array(z.string()).optional(),

  focusDiscourseme: z.number().optional(),

  partition: z.number().optional(),
})

export function useUfaSelection() {
  const navigate = useNavigate()
  const { corpusId, subcorpusId, focusDiscourseme, partition } =
    Route.useSearch()
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

  const { data: partitions, error: subcorpusCollectionsError } = useQuery({
    ...subcorpusCollections(corpusId!, subcorpusId),
    select: (collections) =>
      collections.map(({ id, name, description }) => ({
        id,
        label: name + (description ? ` (${description})` : ''),
      })),
    enabled: corpusId !== undefined,
  })

  analysisLayer = defaultValue(layers, analysisLayer, 'lemma')

  const isValidSelection =
    corpusId !== undefined &&
    focusDiscourseme !== undefined &&
    analysisLayer !== undefined &&
    partition !== undefined

  const isFaultySelection =
    !isValidSelection && !errorLayers && !subcorpusCollectionsError

  return {
    errors: [errorLayers, subcorpusCollectionsError],
    isValidSelection,
    isFaultySelection,
    analysisLayer,
    corpusId,
    subcorpusId,
    layers,
    partitions,
    structuredAttributes,
    focusDiscourseme,
    partition,
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
          partition: undefined,
        }),
      }),
    setFocusDiscourseme: (focusDiscourseme?: number) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, focusDiscourseme }),
      }),
    setPartition: (partition: number | undefined) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, partition }),
      }),
  }
}
