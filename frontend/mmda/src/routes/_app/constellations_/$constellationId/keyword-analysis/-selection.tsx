import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { cn } from '@cads/shared/lib/utils'
import { LabelBox } from '@cads/shared/components/label-box'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { ContextBreakInput } from '@cads/shared/components/concordances'

import { useKeywordSelection } from './-use-keyword-selection'

export function KeywordSelection({ className }: { className?: string }) {
  const { corpusId } = useKeywordSelection()

  return (
    <div className={cn('grid grid-cols-2 content-start gap-2', className)}>
      <CorpusInput />
      <AnalysisLayerInput />
      <ReferenceCorpusInput />
      <ReferenceLayerInput />
      <ContextBreakInput
        className="col-span-full"
        disabled={corpusId === undefined}
      />
    </div>
  )
}

function CorpusInput({ className }: { className?: string }) {
  const { corpusId, subcorpusId, setCorpus } = useKeywordSelection()
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
    useKeywordSelection()
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

function ReferenceCorpusInput() {
  const { referenceCorpusId, referenceSubcorpusId, setReferenceCorpus } =
    useKeywordSelection()
  return (
    <LabelBox labelText="Reference Corpus">
      <SelectSubcorpus
        className="w-full"
        onChange={setReferenceCorpus}
        corpusId={referenceCorpusId}
        subcorpusId={referenceSubcorpusId}
      />
    </LabelBox>
  )
}

function ReferenceLayerInput() {
  const {
    referenceCorpusId,
    referenceLayer,
    referenceLayers,
    setReferenceLayer,
  } = useKeywordSelection()
  return (
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
  )
}
