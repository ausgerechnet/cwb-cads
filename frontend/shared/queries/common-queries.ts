import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { queryClient } from './query-client'
import { apiClient, schemas } from '../api-client'

// ==================== QUERIES ====================
export const queriesList = queryOptions({
  queryKey: ['queries'],
  queryFn: ({ signal }) => apiClient.get('/query/', { signal }),
  placeholderData: [],
})

export const queryById = (queryId: number) =>
  queryOptions({
    queryKey: ['query', queryId],
    queryFn: ({ signal }) =>
      apiClient.get('/query/:id', { params: { id: String(queryId) }, signal }),
  })

export const createQueryCQP: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryIn>
> = {
  // @ts-expect-error - TS has issues with excessively nested generics
  mutationFn: (body) => apiClient.post('/query/', body),
  onSuccess: () => {
    void queryClient.invalidateQueries(queriesList)
  },
}

export const createQueryAssisted: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryAssistedIn>
> = {
  mutationFn: (body) => apiClient.post('/query/assisted/', body),
  onSuccess: () => {
    void queryClient.invalidateQueries(queriesList)
  },
}

export const deleteQuery: MutationOptions<unknown, Error, string> = {
  mutationFn: (queryId: string) =>
    apiClient.delete('/query/:id', undefined, { params: { id: queryId } }),
  onSuccess: () => {
    void queryClient.invalidateQueries(queriesList)
  },
}

export const queryBreakdownForP = (queryId: number, p: string) =>
  queryOptions({
    queryKey: ['query-breakdown', queryId, p],
    queryFn: async () =>
      apiClient.get('/query/:query_id/breakdown', {
        queries: { p },
        params: { query_id: String(queryId) },
      }),
  })

export const queryConcordances = (
  queryId: number,
  {
    window,
    primary,
    secondary,
    filterItem: filter_item,
    filterItemPAtt: filter_item_p_att,
    pageSize: page_size,
    pageNumber: page_number,
    sortOrder: sort_order,
    sortByOffset: sort_by_offset,
  }: {
    window?: number
    primary?: string
    secondary?: string
    filterItem?: string
    filterItemPAtt?: string
    pageSize?: number
    pageNumber?: number
    sortOrder?: 'ascending' | 'descending' | 'random'
    sortByOffset?: number
  } = {},
) =>
  queryOptions({
    queryKey: [
      'query-concordances',
      queryId,
      window,
      primary,
      secondary,
      filter_item,
      filter_item_p_att,
      page_size,
      page_number,
      sort_order,
      sort_by_offset,
    ],
    queryFn: ({ signal }) =>
      apiClient.get('/query/:query_id/concordance', {
        params: { query_id: String(queryId) },
        queries: {
          window,
          primary,
          secondary,
          filter_item,
          filter_item_p_att,
          page_size,
          page_number,
          sort_order,
          sort_by_offset,
        },
        signal,
      }),
  })

export const shuffleQueryConcordances: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  number
> = {
  mutationFn: (queryId) =>
    apiClient.post('/query/:query_id/concordance/shuffle', undefined, {
      params: { query_id: String(queryId) },
    }),
  onSuccess: (data) => {
    const queryId =
      // TODO: QueryOut should have more mandatory fields
      data.query_id === undefined ? undefined : data.id
    if (queryId === undefined) return
    void queryClient.invalidateQueries(queryConcordances(queryId))
  },
}

// ==================== CORPORA ====================

export const corpusById = (corpusId: number) =>
  queryOptions({
    queryKey: ['corpus', corpusId],
    queryFn: ({ signal }) =>
      apiClient.get('/corpus/:id', {
        params: { id: String(corpusId) },
        signal,
      }),
  })

export const corpusList = queryOptions({
  queryKey: ['corpora'],
  queryFn: ({ signal }) => apiClient.get('/corpus/', { signal }),
})

export const subcorporaList = queryOptions({
  queryKey: ['subcorpora'],
  queryFn: async ({ signal }) => {
    const corpora = await apiClient.get('/corpus/', { signal })
    return (
      await Promise.all(
        corpora.map(
          async (corpus) =>
            apiClient.get('/corpus/:id/subcorpus/', {
              params: { id: corpus.id?.toString() ?? '' },
            }),
          signal,
        ),
      )
    ).flat()
  },
})

export const subcorpusOf = (corpusId: number) =>
  queryOptions({
    queryKey: ['subcorpora', corpusId],
    queryFn: ({ signal }) =>
      apiClient.get('/corpus/:id/subcorpus/', {
        params: { id: corpusId.toString() },
        signal,
      }),
  })

export const createSubcorpus: MutationOptions<
  z.infer<typeof schemas.SubCorpusOut>,
  Error,
  z.infer<typeof schemas.SubCorpusIn> & { corpus_id: number }
> = {
  mutationFn: async ({ corpus_id, ...args }) =>
    apiClient.put('/corpus/:id/subcorpus/', args, {
      params: { id: corpus_id.toString() },
    }),
  onSuccess: (data) => {
    void queryClient.invalidateQueries(corpusList)
    void queryClient.invalidateQueries(subcorporaList)
    void queryClient.invalidateQueries(corpusById(data.corpus?.id ?? -1))
  },
}

export const corpusMetaFrequencies = (
  corpusId: number,
  level: string,
  key: string,
  createAsIfNotExists:
    | 'datetime'
    | 'numeric'
    | 'unicode'
    | 'boolean'
    | false = false,
) =>
  queryOptions({
    // createAsIfNotExists is a hack to create a new meta key if it doesn't exist, should not be a dep
    // TODO: move this to the backend, probably
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['corpus-meta-frequencies', corpusId, level, key],
    queryFn: async ({ signal }) => {
      if (!createAsIfNotExists) {
        return getFrequencies()
      }
      try {
        return await getFrequencies()
      } catch (error) {
        await apiClient.put(
          '/corpus/:id/meta/',
          { level, key, value_type: createAsIfNotExists },
          { params: { id: corpusId.toString() } },
        )
        return await getFrequencies()
      }
      function getFrequencies() {
        return apiClient.get('/corpus/:id/meta/frequencies', {
          params: { id: corpusId.toString() },
          queries: { level, key },
          signal,
        })
      }
    },
  })

// ==================== USERS ====================

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: ({ signal }) => apiClient.get('/user/identify', { signal }),
  retry: 1,
})

export const logIn: MutationOptions<
  z.infer<typeof schemas.HTTPTokenOut>,
  Error,
  z.infer<typeof schemas.UserIn>
> = {
  mutationFn: (credentials) => apiClient.post('/user/login', credentials),
  onSuccess: ({ access_token, refresh_token }) => {
    if (access_token) {
      localStorage.setItem('access-token', access_token)
    }
    if (refresh_token) {
      localStorage.setItem('refresh-token', refresh_token)
    }
    void queryClient.invalidateQueries(sessionQueryOptions)
  },
}

export const usersList = queryOptions({
  queryKey: ['all-users'],
  queryFn: ({ signal }) => apiClient.get('/user/', { signal }),
  staleTime: 0,
})

export const logOut: MutationOptions = {
  mutationFn: async () => {
    localStorage.removeItem('access-token')
    localStorage.removeItem('refresh-token')
  },
  onSuccess: () => {
    queryClient.setQueryData(sessionQueryOptions.queryKey, null)
    void queryClient.invalidateQueries(sessionQueryOptions)
  },
}
// ==================== KEYWORD ANALYSIS ====================

export const keywordAnalysesList = queryOptions({
  queryKey: ['keyword-analyses-list'],
  queryFn: ({ signal }) => apiClient.get('/keyword/', { signal }),
})

export const keywordAnalysisById = (keywordAnalysisId: number) =>
  queryOptions({
    queryKey: ['keyword-analysis', keywordAnalysisId],
    queryFn: ({ signal }) =>
      apiClient.get('/keyword/:id/', {
        params: { id: keywordAnalysisId.toString() },
        signal,
      }),
  })

export const createKeywordAnalysis: MutationOptions<
  z.infer<typeof schemas.KeywordOut>,
  Error,
  z.infer<typeof schemas.KeywordIn>
> = {
  mutationFn: (body) => apiClient.post('/keyword/', body),
  onSettled: () => {
    void queryClient.invalidateQueries(keywordAnalysesList)
  },
}

// ==================== SEMANTIC MAP ====================

export const putSemanticMapCoordinates: MutationOptions<
  z.infer<typeof schemas.CoordinatesOut>[],
  Error,
  z.infer<typeof schemas.CoordinatesIn> & { semanticMapId: number }
> = {
  mutationFn: ({ semanticMapId, ...body }) =>
    apiClient.put('/semantic-map/:id/coordinates/', body, {
      params: { id: semanticMapId.toString() },
    }),
  onSuccess: () => {
    // TODO: should not invalidate anything, but update the cache; requires more information though
  },
}
