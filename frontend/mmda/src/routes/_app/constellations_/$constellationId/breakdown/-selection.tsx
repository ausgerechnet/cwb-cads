import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { LabelBox } from '@cads/shared/components/label-box'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'

import { useBreakdownSelection } from './-use-breakdown-selection'

export function BreakdownSelection() {
  return (
    <div className="grid grid-cols-[2fr_1fr] content-start gap-2">
      <CorpusInput />
      <AnalysisLayerInput />
    </div>
  )
}

function CorpusInput({ className }: { className?: string }) {
  const { corpusId, subcorpusId, setCorpus } = useBreakdownSelection()
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
    useBreakdownSelection()
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
