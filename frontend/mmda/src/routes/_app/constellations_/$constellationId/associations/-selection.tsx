import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { LabelBox } from '@cads/shared/components/label-box'

import { useAssociationsSelection } from './-use-associations-selection'

export function AssociationsSelection({ className }: { className?: string }) {
  const { corpusId, subcorpusId, setCorpus } = useAssociationsSelection()
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
