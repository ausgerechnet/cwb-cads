import { Loader2Icon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { Card } from '@cads/shared/components/ui/card'
import { discoursemesList } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { LabelBox } from '@cads/shared/components/label-box'
import { ToggleBar } from '@cads/shared/components/toggle-bar'

import { useDescription } from './-use-description'
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

export function AnalysisSelection({ className }: { className?: string }) {
  const {
    corpusId,
    subcorpusId,
    focusDiscourseme,
    analysisType,
    referenceCorpusId,
    referenceSubcorpusId,
    setCorpus,
    setAnalysisType,
    setReferenceCorpus,
    setFocusDiscourseme,
  } = useAnalysisSelection()

  const { description, isLoadingDescription, errorDescription } =
    useDescription()
  const { data: discoursemes = [] } = useQuery(discoursemesList)

  const constellationIds = (description?.discourseme_descriptions ?? []).map(
    (d) => d.discourseme_id,
  )
  const discoursemesInDescription = discoursemes.filter((d) =>
    constellationIds.includes(d.id),
  )

  return (
    <Card className={cn('p-4', className)}>
      <ErrorMessage error={errorDescription} />

      <div className="grid grid-cols-2 gap-4">
        <LabelBox labelText="Corpus or Subcorpus">
          <SelectSubcorpus
            className="w-full"
            onChange={setCorpus}
            corpusId={corpusId}
            subcorpusId={subcorpusId}
          />
        </LabelBox>

        <LabelBox labelText="Analysis Type">
          <ToggleBar
            options={
              [
                ['collocation', 'Collocation Analysis'],
                ['ufa', 'UFA'],
                ['keyword', 'Keyword Analysis'],
              ] as const
            }
            value={analysisType}
            onChange={setAnalysisType}
          />
        </LabelBox>

        {(analysisType === 'collocation' || analysisType === 'ufa') && (
          <LabelBox
            labelText="Focus Discourseme"
            className={analysisType === 'collocation' ? 'col-span-full' : ''}
          >
            <DiscoursemeSelect
              discoursemes={discoursemesInDescription}
              discoursemeId={focusDiscourseme}
              onChange={setFocusDiscourseme}
              disabled={isLoadingDescription || corpusId === undefined}
              className="w-full"
            />
            {isLoadingDescription && (
              <Loader2Icon className="absolute left-1/2 top-2 animate-spin" />
            )}
          </LabelBox>
        )}

        {analysisType === 'ufa' && (
          <LabelBox labelText="Partition">
            <ErrorMessage error="Not yet implemented" />
          </LabelBox>
        )}

        {analysisType === 'keyword' && (
          <>
            <LabelBox labelText="Reference Corpus" className="col-span-full">
              <SelectSubcorpus
                className="w-full"
                onChange={setReferenceCorpus}
                corpusId={referenceCorpusId}
                subcorpusId={referenceSubcorpusId}
              />
            </LabelBox>
          </>
        )}
      </div>
    </Card>
  )
}
