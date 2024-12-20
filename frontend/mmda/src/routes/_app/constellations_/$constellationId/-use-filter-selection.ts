import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { corpusById } from '@cads/shared/queries'

export const FilterSchema = z.object({
  pAtt: z.string().optional(),
  s: z.string().optional().catch(undefined),
  windowSize: z.number().positive().min(2).int().optional().catch(undefined),
  primary: z.string().optional(),
  secondary: z.string().optional().catch(undefined),
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
  ccSortBy: z
    .enum([
      'conservative_log_ratio',
      'O11',
      'E11',
      'ipm',
      'log_likelihood',
      'z_score',
      't_score',
      'simple_ll',
      'dice',
      'log_ratio',
      'min_sensitivity',
      'liddell',
      'mutual_information',
      'local_mutual_information',
    ] as const)
    .optional()
    .catch(undefined),
  ccFilterItem: z.string().optional().catch(undefined),
  ccFilterItemPAtt: z.string().optional().catch(undefined),
  // semanticBreak: z.string().optional().catch(undefined),
  semanticMapId: z.number().optional().catch(undefined),
  // TODO: probably should be here, because it's fixed for queries for example
  corpusId: z.number().optional().catch(undefined),
  subcorpusId: z.number().optional().catch(undefined),
  focusDiscourseme: z.number().optional().catch(undefined),
  isConcordanceVisible: z.boolean().optional().catch(true),
})

type FilterSchema = z.infer<typeof FilterSchema>

// TODO: also use this in query detail etc.
export function useFilterSelection(
  path:
    | '/_app/constellations_/$constellationId'
    | '/_app/constellations_/$constellationId/semantic-map',
) {
  const {
    windowSize = 10,
    clSortByOffset = 0,
    clSortOrder = 'random',
    clPageIndex = 0,
    clPageSize = 5,
    clFilterItem,
    clFilterItemPAtt,
    ccSortBy = 'conservative_log_ratio',
    ccPageSize = 5,
    ccSortOrder = 'descending',
    ccFilterItem,
    ccFilterItemPAtt,
    s,
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
  const setFilter = useCallback(
    <K extends keyof FilterSchema>(key: K, value: FilterSchema[K]) => {
      void navigate({
        to: '',
        search: (s) => ({ ...s, [key]: value }),
        params: (p) => p,
        replace: true,
      })
    },
    [navigate],
  )

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
    clFilterItem,
    clFilterItemPAtt,
    ccSortBy: isSortable ? ccSortBy : undefined,
    ccPageSize,
    ccSortOrder,
    ccFilterItem,
    ccFilterItemPAtt,
    setFilter,
    primary: defaultTo([primary, 'word'], corpus?.p_atts),
    secondary: defaultTo(secondary, corpus?.p_atts),
    s: defaultTo(s, corpus?.s_atts),
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
