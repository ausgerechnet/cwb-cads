import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'

import { corpusById } from '@cads/shared/queries'

import { Route } from './route'

const AnalysisType = z.enum(['collocation', 'keyword', 'ufa'])
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
      analysisType: 'collocation'
      corpusId: number
      subcorpusId?: number
      analysisLayer: string
      focusDiscourseme: number
    }
  | {
      analysisType: 'keyword'
      corpusId: number
      subcorpusId?: number
      analysisLayer: string
      referenceCorpusId: number
      referenceSubcorpusId?: number
      referenceLayer: string
    }
  | {
      analysisType: 'ufa'
      corpusId: number
      subcorpusId?: number
      partition: number
    }

export function useAnalysisSelection() {
  const navigate = useNavigate()
  const {
    corpusId,
    subcorpusId,
    analysisLayer,
    analysisType = 'collocation',
    focusDiscourseme,
    referenceCorpusId,
    referenceSubcorpusId,
    referenceLayer,
    partition,
  } = Route.useSearch()

  const { data: layers } = useQuery({
    ...corpusById(corpusId!, subcorpusId),
    select: (corpus) => corpus.p_atts,
    enabled: corpusId !== undefined,
  })

  const { data: referenceLayers } = useQuery({
    ...corpusById(referenceCorpusId!, referenceSubcorpusId),
    select: (corpus) => corpus.p_atts,
    enabled: referenceCorpusId !== undefined,
  })

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
      if (corpusId !== undefined && partition !== undefined) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          partition,
        }
      }
      break
  }

  return {
    analysisType,
    analysisSelection,
    analysisLayer,
    corpusId,
    subcorpusId,
    layers,
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
            default:
              throw new Error(`Invalid analysis type ${analysisType}`)
          }
        },
      }),
  }
}
