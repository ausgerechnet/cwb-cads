import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { LabelBox } from '@cads/shared/components/label-box'

import { useAssociationsSelection } from './-use-associations-selection'
import { cn } from '@cads/shared/lib/utils'
import { SelectSingle } from '@cads/shared/components/select-single'

export function AssociationsSelection({ className }: { className?: string }) {
  const {
    corpusId,
    subcorpusId,
    setCorpus,
    contextBreakList,
    contextBreak,
    setContextBreak,
  } = useAssociationsSelection()

  return (
    <div
      className={cn('grid grid-cols-[2fr_1fr] content-start gap-2', className)}
    >
      <LabelBox labelText="Corpus or Subcorpus" className="w-full">
        <SelectSubcorpus
          onChange={setCorpus}
          corpusId={corpusId}
          subcorpusId={subcorpusId}
          className="w-full"
        />
      </LabelBox>

      <LabelBox labelText="Context Break">
        <SelectSingle
          disabled={corpusId === undefined}
          value={contextBreak}
          onValueChange={setContextBreak}
          placeholder="Select context break"
          items={contextBreakList}
        />
      </LabelBox>
    </div>
  )
}
