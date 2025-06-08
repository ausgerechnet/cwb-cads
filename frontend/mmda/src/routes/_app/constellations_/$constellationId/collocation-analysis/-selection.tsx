import { Loader2Icon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { discoursemesList } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { LabelBox } from '@cads/shared/components/label-box'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { SelectSingle } from '@cads/shared/components/select-single'

import { useCollocationSelection } from './-use-collocation-selection'
import { useDescription } from '../-use-description'

export function CollocationSelection() {
  const { corpusId } = useCollocationSelection()
  return (
    <div className="grid grid-cols-2 content-start gap-2">
      <CorpusInput />
      <AnalysisLayerInput />
      <FocusDiscoursemeInput />
      <ContextBreakInput disabled={corpusId === undefined} />
    </div>
  )
}

function CorpusInput({ className }: { className?: string }) {
  const { corpusId, subcorpusId, setCorpus } = useCollocationSelection()
  return (
    <LabelBox labelText="Corpus or Subcorpus" className={className}>
      <SelectSubcorpus
        className="w-full"
        onChange={setCorpus}
        corpusId={corpusId}
        subcorpusId={subcorpusId}
      />
    </LabelBox>
  )
}

function AnalysisLayerInput() {
  const { corpusId, layers, analysisLayer, setAnalysisLayer } =
    useCollocationSelection()
  return (
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
  )
}

function FocusDiscoursemeInput({ className }: { className?: string }) {
  const { corpusId, focusDiscourseme, setFocusDiscourseme } =
    useCollocationSelection()

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
    <LabelBox labelText="Focus Discourseme" className={className}>
      <ErrorMessage error={errorDescription} className="col-span-full" />

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
  )
}

function ContextBreakInput({
  className,
  disabled,
}: {
  className?: string
  disabled?: boolean
}) {
  const { contextBreak, setContextBreak, structuredAttributes } =
    useCollocationSelection()

  return (
    <LabelBox className={className} labelText="Context Break">
      <SelectSingle
        placeholder="Context Break"
        value={contextBreak}
        onValueChange={(value) => setContextBreak(value)}
        disabled={!structuredAttributes || disabled}
        items={structuredAttributes || []}
      />
    </LabelBox>
  )
}
