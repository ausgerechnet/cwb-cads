import { PlusIcon, Loader2Icon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import { SelectSubcorpus } from '@cads/shared/components/select-subcorpus'
import { discoursemesList } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
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
import { buttonVariants } from '@cads/shared/components/ui/button'

import { useDescription } from '../-use-description'
import { useUfaSelection } from './-use-ufa-selection'

export function UfaSelection({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 content-start gap-2', className)}>
      <CorpusInput />
      <AnalysisLayerInput />
      <FocusDiscoursemeInput />
      <PartitionInput />
    </div>
  )
}

function CorpusInput({ className }: { className?: string }) {
  const { corpusId, subcorpusId, setCorpus } = useUfaSelection()
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
    useUfaSelection()
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
  const { corpusId, focusDiscourseme, setFocusDiscourseme } = useUfaSelection()

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

function PartitionInput() {
  const { partition, setPartition, partitions, corpusId, subcorpusId } =
    useUfaSelection()
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
