import { createContext, type ReactNode, useContext } from 'react'
import { z } from 'zod'
import { QueryFunction, type QueryKey } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { type ConcordanceFilterSchema } from './concordance-filter-schema'
import { schemas } from '../../api-client'
import { defaultValue } from '../../lib/legal-default-value'
import { clamp } from '../../lib/clamp'

export type ConcordanceContextValue = {
  onItemClick: (word: { primary: string; secondary: string }) => void
  fetchContext: (matchId: number) => {
    queryKey: QueryKey
    queryFn?: QueryFunction<
      z.infer<typeof schemas.ConcordanceLineOut>,
      any,
      never
    >
  }
}

const ConcordanceTableContext = createContext<ConcordanceContextValue>(
  null as unknown as ConcordanceContextValue,
)

export const ConcordanceProvider = ConcordanceTableContext.Provider

export function useConcordanceTableContext() {
  return useContext(ConcordanceTableContext)
}

const ConcordanceFilterContext = createContext<
  ReturnType<typeof useConcordanceFilters>
>(null as unknown as ReturnType<typeof useConcordanceFilters>)

export function ConcordanceFilterProvider({
  params,
  layers,
  structureAttributes,
  children,
}: {
  params: ConcordanceFilterSchema
  layers: string[]
  structureAttributes: string[]
  children: ReactNode
}) {
  const value = useConcordanceFilters(params, layers, structureAttributes)

  return (
    <ConcordanceFilterContext.Provider value={value}>
      {children}
    </ConcordanceFilterContext.Provider>
  )
}

export function useConcordanceFilterContext() {
  return useContext(ConcordanceFilterContext)
}

function useConcordanceFilters(
  params: ConcordanceFilterSchema,
  layers: string[] = [],
  structureAttributes: string[] = [],
) {
  const {
    windowSize = 10,
    primary: primaryInput,
    secondary: secondaryInput,
    clContextBreak: clContextBreakInput,
    clFilterDiscoursemeIds,
    clSortOrder = 'random',
    clSortByOffset = 0,
    clPageIndex = 0,
    clPageSize = 5,
    clFilterItem,
    clFilterItemPAtt: clFilterItemPAttInput,
  } = params
  const navigate = useNavigate()

  const primary = defaultValue(layers, primaryInput, 'word')
  // if (primary === undefined) throw new Error(`Invalid primary: ${primaryInput}`)
  const secondary = defaultValue(layers, secondaryInput, 'lemma')
  // if (secondary === undefined)
  //   throw new Error(`Invalid secondary: ${secondaryInput}`)

  const clFilterItemPAtt = defaultValue(layers, clFilterItemPAttInput, 'lemma')

  const clContextBreak = defaultValue(
    structureAttributes,
    clContextBreakInput,
    'text',
  )

  function updateFilters(filters: Partial<ConcordanceFilterSchema>) {
    navigate({
      replace: true,
      // @ts-ignore
      hash: (h) => h,
      // @ts-expect-error
      params: (p) => p,
      // @ts-expect-error
      search: (s) => ({
        ...s,
        ...filters,
      }),
    })
  }

  return {
    windowSize,
    primary,
    secondary,
    clContextBreak,
    clFilterDiscoursemeIds,
    clSortOrder,
    clSortByOffset,
    clPageIndex,
    clPageSize,
    clFilterItem,
    clFilterItemPAtt,

    structureAttributes,
    layers,

    setPage: (pageIndex: number) => updateFilters({ clPageIndex: pageIndex }),
    setPageSize: (pageSize: number) =>
      updateFilters({ clPageSize: pageSize, clPageIndex: 0 }),
    setPageIndex: (pageIndex: number) =>
      updateFilters({ clPageIndex: pageIndex }),
    setWindowSize: (size: number) =>
      updateFilters({ windowSize: clamp(size, 1, 100) }),
    setPrimary: (primary: string) =>
      updateFilters({ primary: defaultValue(layers, primary) }),
    setSecondary: (secondary: string) =>
      updateFilters({
        secondary: defaultValue(layers, secondary),
      }),
    setContextBreak: (contextBreak: string) =>
      updateFilters({ clContextBreak: contextBreak }),
    setDiscoursemeIds: (discoursemeIds: number[]) =>
      updateFilters({ clFilterDiscoursemeIds: discoursemeIds }),
    setSortOrder: (sortOrder: ConcordanceFilterSchema['clSortOrder']) =>
      updateFilters({ clSortOrder: sortOrder }),
    setSortByOffset: (sortByOffset: number) =>
      updateFilters({ clSortByOffset: sortByOffset }),
    setFilterItem: (filterItem: string | undefined, filterItemPAtt: string) => {
      updateFilters({
        clFilterItem: filterItem,
        clFilterItemPAtt: filterItemPAtt,
        clPageIndex: 0,
      })
    },
  }
}
