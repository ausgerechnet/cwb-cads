import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'

// TODO: also use this in query detail etc.
export function useFilterSelection(
  path: '/_app/constellations/$constellationId',
) {
  const {
    windowSize = 3,
    clSortByOffset = 0,
    clSortOrder = 'descending',
    ...search
  } = useSearch({ from: path, strict: true })
  const navigate = useNavigate()
  const setFilter = useCallback(
    (key: string, value: string | number | boolean | undefined) => {
      void navigate({
        search: (s) => ({ ...s, [key]: value }),
        params: (p) => p,
        replace: true,
      })
    },
    [navigate],
  )
  return {
    ...search,
    windowSize,
    clSortByOffset,
    clSortOrder,
    setFilter,
  }
}
