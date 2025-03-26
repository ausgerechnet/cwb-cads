import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Route } from './route'

const AnalysisType = z.enum(['collocation', 'keyword', 'ufa'])
type AnalysisType = z.infer<typeof AnalysisType>

export const AnalysisSchema = z.object({
  corpusId: z.number().optional(),
  subscorpusId: z.number().optional(),
  analysisType: AnalysisType.optional(),
  focusDiscourseme: z.number().optional(),
  referenceCorpusId: z.number().optional(),
  referenceSubcorpusId: z.number().optional(),
  partition: z.number().optional(),
})

type AnalysisSelection =
  | {
      analysisType: 'collocation'
      corpusId: number
      subcorpusId?: number
      focusDiscourseme: number
    }
  | {
      analysisType: 'keyword'
      corpusId: number
      subcorpusId?: number
      referenceCorpusId: number
      referenceSubcorpusId?: number
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
    analysisType = 'collocation',
    focusDiscourseme,
    referenceCorpusId,
    referenceSubcorpusId,
    partition,
  } = Route.useSearch()

  let analysisSelection: AnalysisSelection | undefined = undefined
  switch (analysisType) {
    case 'collocation':
      if (corpusId !== undefined && focusDiscourseme !== undefined) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          focusDiscourseme,
        }
      }
      break
    case 'keyword':
      if (corpusId !== undefined && referenceCorpusId !== undefined) {
        analysisSelection = {
          analysisType,
          corpusId,
          subcorpusId,
          referenceCorpusId,
          referenceSubcorpusId,
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
    corpusId,
    subcorpusId,
    referenceCorpusId:
      analysisType === 'collocation' ? undefined : referenceCorpusId,
    referenceSubcorpusId:
      analysisType === 'collocation' ? undefined : referenceSubcorpusId,
    focusDiscourseme:
      analysisType === 'collocation' ? focusDiscourseme : undefined,
    partition: analysisType === 'collocation' ? partition : undefined,
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
                partition: undefined,
              }
            case 'ufa':
              return {
                ...s,
                analysisType,
                referenceCorpusId: undefined,
                referenceSubcorpusId: undefined,
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
