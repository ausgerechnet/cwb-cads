import { PlusIcon, Loader2Icon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

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
import { buttonVariants } from '@cads/shared/components/ui/button'

import { useAnalysisSelection } from './-use-analysis-selection'
import { useDescription } from './-use-description'
import { ContextBreakInput } from '@cads/shared/components/concordances'

export function AnalysisSelection({ className }: { className?: string }) {
  'use no memo'

  const { analysisType, setAnalysisType, corpusId } = useAnalysisSelection()

  return (
    <Card className={cn('grid grid-cols-2 content-start gap-2 p-4', className)}>
      <ToggleBar
        options={
          [
            ['collocation', 'Collocation Analysis'],
            ['ufa', 'UFA'],
            ['keyword', 'Keyword Analysis'],
            ['associations', 'Associations'],
            ['breakdown', 'Breakdown'],
          ] as const
        }
        value={analysisType}
        onChange={setAnalysisType}
        className="col-span-full"
      />

      {analysisType === 'collocation' && (
        <>
          <CorpusInput />
          <AnalysisLayerInput />
          <FocusDiscoursemeInput />
          <ContextBreakInput disabled={corpusId === undefined} />
        </>
      )}

      {analysisType === 'ufa' && (
        <>
          <CorpusInput />
          <AnalysisLayerInput />
          <FocusDiscoursemeInput />
          <PartitionInput />
        </>
      )}

      {analysisType === 'keyword' && (
        <>
          <CorpusInput />
          <AnalysisLayerInput />
          <ReferenceCorpusInput />
          <ReferenceLayerInput />
          <ContextBreakInput
            className="col-span-full"
            disabled={corpusId === undefined}
          />
        </>
      )}

      {analysisType === 'associations' && (
        <>
          <CorpusInput className="col-span-full" />
        </>
      )}

      {analysisType === 'breakdown' && (
        <>
          <CorpusInput />
          <AnalysisLayerInput />
        </>
      )}
    </Card>
  )
}

function CorpusInput({ className }: { className?: string }) {
  const { corpusId, subcorpusId, setCorpus } = useAnalysisSelection()
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
    useAnalysisSelection()
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
    useAnalysisSelection()

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

      {!errorDescription && (
        <DiscoursemeSelect
          discoursemes={discoursemesInDescription}
          discoursemeId={focusDiscourseme}
          onChange={setFocusDiscourseme}
          disabled={isLoadingDescription || corpusId === undefined}
          className="w-full"
        />
      )}

      {isLoadingDescription && (
        <Loader2Icon className="absolute left-1/2 top-2 animate-spin" />
      )}
    </LabelBox>
  )
}

function ReferenceCorpusInput() {
  const { referenceCorpusId, referenceSubcorpusId, setReferenceCorpus } =
    useAnalysisSelection()
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
  } = useAnalysisSelection()
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

function PartitionInput() {
  const { partition, setPartition, partitions, corpusId, subcorpusId } =
    useAnalysisSelection()
  return (
    <LabelBox labelText="Subcorpus Collection">
      {partitions?.length ? (
        <div className="flex gap-2">
          <Select
            disabled={partitions === undefined || partitions.length === 0}
            value={String(partition ?? '')}
            onValueChange={(value) => setPartition(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Subcorpus Collection" />
            </SelectTrigger>

            <SelectContent>
              <SelectGroup>
                {(partitions ?? []).map(({ id, label }) => (
                  <SelectItem key={id} value={String(id)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Link
            to="/partition"
            search={{
              defaultCorpusId: corpusId,
              defaultSubcorpusId: subcorpusId,
            }}
            className={buttonVariants({ size: 'icon' })}
          >
            <PlusIcon className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <Link
          to="/partition"
          search={{
            defaultCorpusId: corpusId,
            defaultSubcorpusId: subcorpusId,
          }}
          className={cn(buttonVariants(), 'flex text-xs')}
        >
          No Subcorpus Collections, yet - Create One?
        </Link>
      )}
    </LabelBox>
  )
}
