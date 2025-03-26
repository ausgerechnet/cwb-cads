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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'

import { useDescription } from './-use-description'
import { useAnalysisSelection } from './-use-analysis-selection'

export function AnalysisSelection({ className }: { className?: string }) {
  'use no memo'
  const {
    corpusId,
    subcorpusId,
    layers,
    focusDiscourseme,
    analysisType,
    referenceCorpusId,
    referenceSubcorpusId,
    referenceLayer,
    referenceLayers,
    analysisLayer,
    setCorpus,
    setAnalysisType,
    setReferenceCorpus,
    setFocusDiscourseme,
    setAnalysisLayer,
    setReferenceLayer,
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
    <Card className={cn('grid grid-cols-2 content-start gap-2 p-4', className)}>
      <ErrorMessage error={errorDescription} className="col-span-full" />

      <LabelBox labelText="Analysis Type" className="col-span-full">
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

      <LabelBox labelText="Corpus or Subcorpus">
        <SelectSubcorpus
          className="w-full"
          onChange={setCorpus}
          corpusId={corpusId}
          subcorpusId={subcorpusId}
        />
      </LabelBox>

      <LabelBox labelText="Analysis Layer">
        <Select
          disabled={corpusId === undefined || !layers}
          value={analysisLayer ?? ''}
          onValueChange={setAnalysisLayer}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select analysis layer" />
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              {(layers ?? ([] satisfies string[])).map((layer) => (
                <SelectItem key={layer} value={layer}>
                  {layer}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
          <LabelBox labelText="Reference Corpus">
            <SelectSubcorpus
              className="w-full"
              onChange={setReferenceCorpus}
              corpusId={referenceCorpusId}
              subcorpusId={referenceSubcorpusId}
            />
          </LabelBox>

          <LabelBox labelText="Reference Analysis Layer">
            <Select
              disabled={referenceCorpusId === undefined || !referenceLayers}
              value={referenceLayer ?? ''}
              onValueChange={setReferenceLayer}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select analysis layer" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {(referenceLayers ?? ([] satisfies string[])).map((layer) => (
                    <SelectItem key={layer} value={layer}>
                      {layer}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </LabelBox>
        </>
      )}
    </Card>
  )
}
