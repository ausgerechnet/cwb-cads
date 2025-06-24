import { useQuery } from '@tanstack/react-query'

import { constellationDescriptionFor, corpusById } from '@cads/shared/queries'
import { Route } from './route'

export function useDescription() {
  const constellationId = parseInt(Route.useParams().constellationId)
  const searchParams = Route.useSearch()
  const corpusId = searchParams.corpusId
  const subcorpusId = searchParams.subcorpusId
  const {
    data,
    isLoading: isLoadingCorpus,
    error: errorCorpus,
  } = useQuery({
    ...corpusById(corpusId!, subcorpusId),
    enabled: corpusId !== undefined,
  })

  const contextBreak =
    searchParams.contextBreak ||
    searchParams.clContextBreak ||
    data?.s_annotations?.[0]

  const {
    data: description,
    isLoading: isLoadingDescription,
    error: errorDescription,
  } = useQuery({
    ...constellationDescriptionFor({
      constellationId,
      corpusId: corpusId!,
      subcorpusId: subcorpusId,
      matchStrategy: 'longest',
      s: contextBreak!,
    }),
    enabled: corpusId !== undefined && contextBreak !== undefined,
  })

  return {
    constellationId,
    description,
    isLoadingDescription: isLoadingCorpus || isLoadingDescription,
    errorDescription: [errorCorpus, errorDescription],
  }
}
