import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { corpusById, subcorpusCollections } from '@cads/shared/queries'

import { Route } from './route'
import { defaultValue } from '@cads/shared/lib/legal-default-value'

const AnalysisType = z.enum([
  'collocation',
  'keyword',
  'ufa',
  'associations',
  'breakdown',
])
type AnalysisType = z.infer<typeof AnalysisType>

export const AnalysisSchema = z.object({
  analysisType: AnalysisType.optional(),

  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisLayer: z.string().optional(),
  layers: z.array(z.string()).optional(),

  focusDiscourseme: z.number().optional(),

  referenceCorpusId: z.number().optional(),
  referenceSubcorpusId: z.number().optional(),
  referenceLayer: z.string().optional(),
  referenceLayers: z.array(z.string()).optional(),

  partition: z.number().optional(),
})

type AnalysisSelection =
  | {
      /**
       * The type of analysis to be performed
       * This will be undefined if the analysis selection is not WHOLLY complete.
       */
      analysisType: 'collocation'
      corpusId: number
      subcorpusId?: number
      analysisLayer: string
      focusDiscourseme: number
      contextBreak?: string
    }
  | {
      analysisType: 'keyword'
      corpusId: number
      subcorpusId?: number
      analysisLayer: string
      referenceCorpusId: number
      referenceSubcorpusId?: number
      referenceLayer: string
      contextBreak?: string
    }
  | {
      analysisType: 'ufa'
      corpusId: number
      subcorpusId?: number
      analysisLayer: string
      partition: number
      focusDiscourseme: number
    }
  | {
      analysisType: 'associations'
      corpusId: number
      subcorpusId?: number
    }
  | {
      analysisType: 'breakdown'
      corpusId: number
      subcorpusId?: number
      analysisLayer: string
    }

export function useAnalysisSelection() {
  const navigate = useNavigate()
  const {
    corpusId,
    subcorpusId,
    analysisType = 'collocation',
    focusDiscourseme,
    referenceCorpusId,
    referenceSubcorpusId,
    partition,
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
  referenceLayer = defaultValue(
    referenceLayers,
    referenceLayer,
    analysisLayer,
    'lemma',
  )

  /**
   * Contains the current analysis selection if all required parameters are set.
   * Will be `undefined` if the selection is incomplete.
   * Guaranteed to be a valid selection if defined.
   */
  let analysisSelection: AnalysisSelection | undefined = undefined
  switch (analysisType) {
    case 'collocation':
      if (
        corpusId !== undefined &&
        focusDiscourseme !== undefined &&
        analysisLayer !== undefined
      ) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          focusDiscourseme,
          analysisLayer,
        }
      }
      break
    case 'keyword':
      if (
        corpusId !== undefined &&
        referenceCorpusId !== undefined &&
        analysisLayer !== undefined &&
        referenceLayer !== undefined
      ) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          referenceCorpusId,
          referenceSubcorpusId,
          referenceLayer,
          analysisLayer,
        }
      }
      break
    case 'ufa':
      if (
        corpusId !== undefined &&
        partition !== undefined &&
        analysisLayer !== undefined &&
        focusDiscourseme !== undefined
      ) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          partition,
          analysisLayer,
          focusDiscourseme,
        }
      }
      break
    case 'breakdown':
      if (corpusId !== undefined && analysisLayer !== undefined) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          analysisLayer,
        }
      }
      break
    case 'associations':
      if (corpusId !== undefined) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
        }
      }
      break
  }

  return {
    errors: [errorLayers, errorReferenceLayers, subcorpusCollectionsError],
    /**
     * Contains the currently selected analysis type even if the selection is incomplete.
     */
    analysisType,
    /**
     * Contains the current analysis selection if all required parameters are set.
     * Will be `undefined` if the selection is incomplete.
     * Guaranteed to be a valid selection if defined.
     */
    analysisSelection,
    analysisLayer,
    corpusId,
    subcorpusId,
    layers,
    partitions,
    structuredAttributes,
    referenceCorpusId,
    referenceSubcorpusId,
    focusDiscourseme,
    referenceLayer,
    referenceLayers,
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
    setPartition: (partition: number | undefined) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => ({ ...s, partition }),
      }),
    setAnalysisType: (analysisType: AnalysisType) =>
      navigate({
        to: '.',
        params: (p) => p,
        search: (s) => {
          switch (analysisType) {
            case 'collocation':
              return {
                ...s,
                analysisType,
                referenceCorpusId: undefined,
                referenceSubcorpusId: undefined,
                referenceLayer: undefined,
                partition: undefined,
              }
            case 'ufa':
              return {
                ...s,
                analysisType,
                referenceCorpusId: undefined,
                referenceSubcorpusId: undefined,
                referenceLayer: undefined,
              }
            case 'keyword':
              return {
                ...s,
                analysisType,
                focusDiscourseme: undefined,
                partition: undefined,
              }
            case 'breakdown':
            // fallthrough
            case 'associations':
              // let's keep all settings!
              // That makes it easier to quickly switch back from the associations view
              return {
                ...s,
                analysisType,
              }
            default:
              throw new Error(`Invalid analysis type ${analysisType}`)
          }
        },
      }),
  }
}
