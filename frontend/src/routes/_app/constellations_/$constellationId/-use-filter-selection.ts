import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo } from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { corpusById } from '@/lib/queries.ts'

export const FilterSchema = z.object({
  pAtt: z.string().optional(),
  s: z.string().optional().catch(undefined),
  windowSize: z.number().positive().min(2).int().optional().catch(undefined),
  primary: z.string().optional(),
  secondary: z.string().optional().catch(undefined),
  clSortOrder: z
    .enum(['ascending', 'descending', 'random'] as const)
    .optional()
    .catch(undefined),
  clSortByOffset: z.number().int().optional().catch(undefined),
  clPageSize: z.number().positive().int().optional().catch(undefined),
  clPageIndex: z.number().nonnegative().int().optional().catch(undefined),
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
  p: z.string().optional().catch(undefined),
  // semanticBreak: z.string().optional().catch(undefined),
  semanticMapId: z.number().optional().catch(undefined),
  filterItem: z.string().optional().catch(undefined),
  filterItemPAtt: z.string().optional().catch(undefined),
  // TODO: probably should be here, because it's fixed for queries for example
  corpusId: z.number().optional().catch(undefined),
  subcorpusId: z.number().optional().catch(undefined),
  isConcordanceVisible: z.boolean().optional().catch(true),
})

type FilterSchema = z.infer<typeof FilterSchema>

// TODO: also use this in query detail etc.
export function useFilterSelection(
  path:
    | '/_app/constellations/$constellationId'
    | '/_app/constellations/$constellationId/semantic-map',
  corpusId?: number,
) {
  const {
    windowSize = 3,
    clSortByOffset = 0,
    clSortOrder = 'descending',
    clPageIndex = 0,
    clPageSize = 5,
    ccSortBy = 'conservative_log_ratio',
    ccPageSize = 5,
    p,
    s,
    primary,
    secondary,
    isConcordanceVisible = true,
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
        search: (s) => ({ ...s, [key]: value }),
        params: (p) => p,
        replace: true,
      })
    },
    [navigate],
  )

  useEffect(() => {
    const sAtts = corpus?.s_atts
    if (!sAtts) return
    if (!sAtts.includes(s!)) {
      setFilter('s', sAtts[0])
    }
  }, [corpus?.s_atts, s, setFilter])

  useEffect(() => {
    const pAtts = corpus?.p_atts
    if (!pAtts) return
    if (p !== undefined && !pAtts.includes(p)) {
      setFilter('p', pAtts[0])
    }
    if (primary !== undefined && !pAtts.includes(primary)) {
      setFilter('primary', pAtts[0])
    }
    if (secondary !== undefined && !pAtts.includes(secondary)) {
      setFilter('secondary', pAtts[0])
    }
  }, [secondary, primary, p, corpus?.p_atts, setFilter])

  const pAttributes = useMemo(() => corpus?.p_atts ?? [], [corpus?.p_atts])
  const contextBreakList = useMemo(() => corpus?.s_atts ?? [], [corpus?.s_atts])

  return {
    ...search,
    windowSize,
    clSortByOffset,
    clSortOrder,
    clPageIndex,
    clPageSize,
    ccSortBy,
    ccPageSize,
    setFilter,
    p: defaultTo(p, corpus?.p_atts),
    primary: defaultTo(primary, corpus?.p_atts),
    secondary: defaultTo(secondary, corpus?.p_atts),
    s: defaultTo(s, corpus?.s_atts),
    pAttributes,
    contextBreakList,
    isConcordanceVisible,
  }
}

function defaultTo<T>(value: T, validValues: T[] | undefined): T | undefined {
  if (validValues === undefined) return value
  if (validValues.includes(value)) return value
  return validValues[0]
}