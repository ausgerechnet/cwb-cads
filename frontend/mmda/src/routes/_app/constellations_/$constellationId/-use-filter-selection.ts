import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { corpusById } from '@cads/shared/queries'
import { measures } from '@cads/shared/components/measures'

export const FilterSchema = z.object({
  pAtt: z.string().optional(),
  clContextBreak: z.string().optional().catch(undefined),
  windowSize: z.number().positive().min(2).int().optional().catch(undefined),
  primary: z.string().optional(),
  secondary: z.string().optional().catch(undefined),
  clFilterDiscoursemeIds: z.number().int().array().optional().catch([]),
  ccFilterDiscoursemeIds: z.number().int().array().optional().catch([]),
  clSortOrder: z
    .enum(['ascending', 'descending', 'random', 'first'] as const)
    .optional()
    .catch(undefined),
  clSortByOffset: z.number().int().optional().catch(undefined),
  clPageSize: z.number().positive().int().optional().catch(undefined),
  clPageIndex: z.number().nonnegative().int().optional().catch(undefined),
  clFilterItem: z.string().optional().catch(undefined),
  clFilterItemPAtt: z.string().optional().catch(undefined),
  ccPageSize: z.number().positive().int().optional().catch(undefined),
  ccPageNumber: z.number().nonnegative().int().optional().catch(undefined),
  ccSortOrder: z
    .enum(['ascending', 'descending'] as const)
    .optional()
    .catch('descending'),
  ccSortBy: z.enum(measures).optional().catch(undefined),
  semanticMapId: z.number().optional().catch(undefined),
  // TODO: probably should be here, because it's fixed for queries for example
  corpusId: z.number().optional().catch(undefined),
  subcorpusId: z.number().optional().catch(undefined),
  focusDiscourseme: z.number().optional().catch(undefined),
  isConcordanceVisible: z.boolean().optional().catch(true),
})

type FilterSchema = z.infer<typeof FilterSchema>

// TODO: also use this in query detail etc. and separate from concordance line logic
export function useFilterSelection(
  path:
    | '/_app/constellations_/$constellationId'
    | '/_app/keyword-analysis_/$analysisId'
    | '/_app/queries_/$queryId',
) {
  const {
    windowSize = 10,
    clSortByOffset = 0,
    clSortOrder = 'random',
    clPageIndex = 0,
    clPageSize = 5,
    clFilterItem,
    clFilterItemPAtt,
    clFilterDiscoursemeIds = [],
    ccSortBy = 'conservative_log_ratio',
    ccPageSize = 5,
    ccSortOrder = 'descending',
    ccFilterDiscoursemeIds = [],
    clContextBreak,
    primary,
    secondary,
    isConcordanceVisible = true,
    corpusId,
    subcorpusId,
    ...search
  } = useSearch({ from: path, strict: true })

  const { data: corpus } = useQuery({
    ...corpusById(corpusId as number),
    enabled: corpusId !== undefined,
  })

  const navigate = useNavigate()
  const setFilter = <K extends keyof FilterSchema>(
    key: K,
    value: FilterSchema[K],
  ) => {
    void navigate({
      to: '.',
      search: (s) => ({ ...s, [key]: value }),
      params: (p) => p,
      replace: true,
    })
  }
  const setFilters = <K extends keyof FilterSchema>(
    values: Record<K, FilterSchema[K]>,
  ) => {
    void navigate({
      to: '.',
      search: (s) => ({ ...s, ...values }),
      params: (p) => p,
      replace: true,
    })
  }

  const pAttributes = useMemo(() => corpus?.p_atts ?? [], [corpus?.p_atts])
  const contextBreakList = useMemo(() => corpus?.s_atts ?? [], [corpus?.s_atts])
  const isSortable = clSortOrder !== 'first' && clSortOrder !== 'random'

  return {
    ...search,
    corpusId,
    subcorpusId,
    isSortable,
    windowSize,
    clSortByOffset: isSortable ? clSortByOffset : undefined,
    clSortOrder,
    clPageIndex,
    clPageSize,
    clFilterItem: clFilterItem || undefined,
    clFilterItemPAtt,
    clFilterDiscoursemeIds,
    ccSortBy,
    ccPageSize,
    ccSortOrder,
    ccFilterDiscoursemeIds,
    setFilter,
    setFilters,
    primary: defaultTo([primary, 'word'], corpus?.p_atts),
    secondary: defaultTo(secondary, corpus?.p_atts),
    clContextBreak: defaultTo(clContextBreak, corpus?.s_atts),
    pAttributes,
    contextBreakList,
    isConcordanceVisible,
  }
}

function defaultTo<T>(value: T | T[], validValues: T[] | undefined): T {
  if (!Array.isArray(value)) {
    value = [value]
  }
  for (const v of value) {
    if (validValues === undefined) return v
    if (validValues.includes(v)) return v
  }
  if (validValues === undefined || validValues.length === 0)
    throw new Error('Invalid arguments passed to defaultTo')
  return validValues[0]
}
