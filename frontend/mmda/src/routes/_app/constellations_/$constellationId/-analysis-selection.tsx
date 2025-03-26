import { Loader2Icon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { Card } from '@cads/shared/components/ui/card'
import { discoursemesList } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { LabelBox } from '@cads/shared/components/label-box'
import { ToggleBar } from '@cads/shared/components/toggle-bar'

import { useDescription } from './-use-description'
import { useAnalysisSelection } from './-use-analysis-selection'

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
