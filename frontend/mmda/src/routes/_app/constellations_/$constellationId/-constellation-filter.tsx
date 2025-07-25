import { Fragment } from 'react'
import { ArrowDownIcon, ArrowUpIcon, FilterIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { cn } from '@cads/shared/lib/utils'
import {
  FilterSchema,
  useFilterSelection,
} from '@/routes/_app/constellations_/$constellationId/-use-filter-selection'
import { Button, buttonVariants } from '@cads/shared/components/ui/button'
import { SelectMulti } from '@cads/shared/components/select-multi'
import { discoursemesList } from '@cads/shared/queries'
import { Link } from '@tanstack/react-router'
import { DiscoursemeName } from '@cads/shared/components/discourseme-name'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'
import {
  FilterItemInput,
  PrimaryInput,
  SecondaryInput,
  SortByOffsetInput,
  SortOrderInput,
  useConcordanceFilterContext,
  WindowSizeInput,
} from '@cads/shared/components/concordances'
import { LabelBox } from '@cads/shared/components/label-box'
import { measures } from '@cads/shared/components/measures'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'

import { useDescription } from './-use-description'

export function ConstellationCollocationFilter({
  hideSortOrder = false,
  hideWindowSize = false,
}: {
  hideSortOrder?: boolean
  hideWindowSize?: boolean
}) {
  const {
    ccSortOrder,
    ccFilterDiscoursemeIds,
    clFilterDiscoursemeIds,
    setFilter,
    ccSortBy,
  } = useFilterSelection('/_app/constellations_/$constellationId')

  const discoursemeFiltersDiffer =
    ccFilterDiscoursemeIds.length !== clFilterDiscoursemeIds.length ||
    ccFilterDiscoursemeIds.some((id) => !clFilterDiscoursemeIds.includes(id))

  return (
    <>
      {!hideWindowSize && <WindowSizeInput className="w-52" />}

      <LabelBox labelText="Filter Discoursemes" className="w-full">
        <div className="flex gap-2">
          <ul className="border-input my-0 flex min-h-10 grow flex-wrap gap-1 overflow-hidden overflow-ellipsis rounded-md border px-3 py-2">
            {ccFilterDiscoursemeIds.map((id, index, { length }) => (
              <li
                key={id}
                className="my-auto inline text-ellipsis text-xs leading-none"
              >
                <DiscoursemeName discoursemeId={id} />
                {index < length - 1 && ', '}
              </li>
            ))}
          </ul>

          {discoursemeFiltersDiffer && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'sm' }),
                      'my-auto ml-auto',
                    )}
                    replace
                    to="."
                    search={(s) => ({
                      ...s,
                      ccPageNumber: 1,
                      ccFilterDiscoursemeIds: [
                        ...(s.clFilterDiscoursemeIds ?? []),
                      ],
                    })}
                    params={(p) => p}
                  >
                    <FilterIcon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Apply Filter Discoursemes from concordance lines:
                  <br />
                  {clFilterDiscoursemeIds.map((id, index, { length }) => (
                    <Fragment key={id}>
                      <DiscoursemeName discoursemeId={id} />
                      {index < length - 1 && ', '}
                    </Fragment>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </LabelBox>

      {!hideSortOrder && (
        <LabelBox labelText="Association Measure" className="w-72 min-w-max">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="flex-grow-0"
                    onClick={() => {
                      setFilter(
                        'ccSortOrder',
                        ccSortOrder === 'ascending'
                          ? 'descending'
                          : 'ascending',
                      )
                    }}
                  >
                    {ccSortOrder === 'ascending' ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                  {ccSortOrder === 'ascending'
                    ? 'Sort by ascending association measure'
                    : 'Sort by descending association measure'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Select
              value={ccSortBy}
              onValueChange={(value) => {
                const sortBy = FilterSchema.shape.ccSortBy.parse(value)
                setFilter('ccSortBy', sortBy)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Association Measure" />
              </SelectTrigger>

              <SelectContent>
                <SelectGroup>
                  {measures.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </LabelBox>
      )}
    </>
  )
}

export function ConstellationConcordanceFilter({
  className,
  hideWindowSize = false,
  hideSecondary = false,
  hideFocusDiscourseme = false,
}: {
  className?: string
  hideWindowSize?: boolean
  hideSecondary?: boolean
  hideFocusDiscourseme?: boolean
}) {
  return (
    <div
      className={cn(
        'z-10 mb-8 grid auto-cols-[1fr] grid-flow-col gap-2',
        className,
      )}
    >
      {!hideWindowSize && <WindowSizeInput />}
      {!hideFocusDiscourseme && (
        <LabelBox labelText="Focus Discourseme">
          <FocusDiscourseme />
        </LabelBox>
      )}

      <LabelBox labelText="Filter Discoursemes" className="col-span-2">
        <FilterDiscoursemes className="w-full" />
      </LabelBox>

      <SortByOffsetInput />

      <SortOrderInput />

      <PrimaryInput />

      {!hideSecondary && <SecondaryInput />}

      <FilterItemInput />
    </div>
  )
}

function FocusDiscourseme({ className }: { className?: string }) {
  const { clFocusDiscoursemeId, setFocusDiscoursemeId } =
    useConcordanceFilterContext()
  const { description } = useDescription()
  const {
    data: allDiscoursemes = [],
    isFetching,
    error,
  } = useQuery(discoursemesList)
  const constellationIds = (description?.discourseme_descriptions ?? []).map(
    (d) => d.discourseme_id,
  )
  const discoursemes = allDiscoursemes.filter((d) =>
    constellationIds.includes(d.id),
  )

  if (error) return <ErrorMessage error={error} />

  return (
    <DiscoursemeSelect
      discoursemes={discoursemes}
      discoursemeId={clFocusDiscoursemeId}
      onChange={setFocusDiscoursemeId}
      className={cn('w-full', isFetching && 'animate-pulse', className)}
      disabled={isFetching}
    />
  )
}

function FilterDiscoursemes({ className }: { className?: string }) {
  const { setFilters, clFilterDiscoursemeIds } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const { description } = useDescription()
  const {
    data: allDiscoursemes = [],
    isLoading,
    error,
  } = useQuery(discoursemesList)
  const constellationIds = (description?.discourseme_descriptions ?? []).map(
    (d) => d.discourseme_id,
  )
  const discoursemes = allDiscoursemes
    .filter((d) => constellationIds.includes(d.id))
    .map((d) => ({ id: d.id!, name: d.name! }))

  return (
    <SelectMulti
      items={discoursemes}
      itemIds={clFilterDiscoursemeIds}
      selectMessage="Select a discourseme…"
      emptyMessage="No discoursemes found…"
      onChange={(ids) =>
        setFilters({ clFilterDiscoursemeIds: ids, clPageIndex: 0 })
      }
      disabled={isLoading || Boolean(error)}
      className={cn(
        isLoading && 'animate-pulse',
        Boolean(error) && 'text-destructive-foreground',
        className,
      )}
    />
  )
}
