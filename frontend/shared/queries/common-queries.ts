import {
  queryOptions,
  MutationOptions,
  infiniteQueryOptions,
} from '@tanstack/react-query'
import { z } from 'zod'
import { queryClient } from './query-client'
import { apiClient, schemas } from '../api-client'
import { SortBy } from './mmda-queries'

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
      apiClient.get('/query/:query_id', {
        params: { query_id: String(queryId) },
        signal,
      }),
  })

export const createQueryCQP: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryIn>
> = {
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

export const getQueryAssisted = ({
  corpusId,
  subcorpusId = undefined,
  p,
  items,
}: {
  corpusId: number
  subcorpusId?: number | null | undefined
  p: string
  items: string[]
}) =>
  queryOptions({
    queryKey: [
      'query-assisted',
      {
        corpusId,
        subcorpusId,
        p,
        items,
      },
    ],
    queryFn: ({ signal }) =>
      apiClient.put(
        '/query/assisted/',
        {
          corpus_id: corpusId,
          subcorpus_id: subcorpusId,
          p,
          items,
        },
        { signal },
      ),
    retry: 0,
  })

export const deleteQuery: MutationOptions<unknown, Error, string> = {
  mutationFn: (queryId: string) =>
    apiClient.delete('/query/:query_id', undefined, {
      params: { query_id: queryId },
    }),
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
    contextBreak: context_break,
  }: {
    window?: number
    primary?: string
    secondary?: string
    filterItem?: string
    filterItemPAtt?: string
    pageSize?: number
    pageNumber?: number
    sortOrder?: 'ascending' | 'descending' | 'random' | 'first'
    sortByOffset?: number
    contextBreak?: string
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
      context_break,
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
          context_break,
        },
        signal,
      }),
  })

export const queryConcordanceContext = (
  queryId: number,
  matchId: number,
  {
    window,
    extendedWindow: extended_window,
    contextBreak: context_break,
    extendedContextBreak: extended_context_break,
    primary,
    secondary,
    highlightQueryIds: highlight_query_ids = [],
  }: {
    window: number
    extendedWindow: number
    contextBreak?: string
    extendedContextBreak?: string
    primary: string
    secondary: string
    highlightQueryIds?: number[]
  },
) =>
  queryOptions({
    queryKey: [
      'query-concordance-context',
      queryId,
      matchId,
      {
        window,
        context_break,
        extended_window,
        extended_context_break,
        primary,
        secondary,
        highlight_query_ids,
      },
    ],
    queryFn: ({ signal }) =>
      apiClient.get('/query/:query_id/concordance/:match_id', {
        params: { query_id: String(queryId), match_id: String(matchId) },
        queries: {
          window,
          context_break,
          extended_window,
          extended_context_break,
          primary,
          secondary,
          highlight_query_ids,
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
  onSuccess: ({ id }) => {
    void queryClient.invalidateQueries({
      queryKey: ['query-concordances', id],
    })
  },
}

export const queryCollocation = (
  queryId: number,
  p: string,
  {
    window,
    semanticBreak: s_break,
    filterItem: filter_item,
    filterItemPAtt: filter_item_p_att,
    semanticMapInit: semantic_map_init,
  }: {
    window?: number
    semanticBreak?: string
    filterItem?: string
    filterItemPAtt?: string
    semanticMapInit?: boolean
  } = {},
) =>
  queryOptions({
    queryKey: [
      'query-collocations',
      queryId,
      p,
      { window, s_break, filter_item, filter_item_p_att, semantic_map_init },
    ],
    queryFn: ({ signal }) =>
      apiClient.put(
        '/query/:query_id/collocation',
        {
          p,
          window,
          s_break,
          filter_item,
          filter_item_p_att,
          semantic_map_init,
        },
        {
          params: { query_id: String(queryId) },
          signal,
        },
      ),
  })

// ==================== CORPORA ====================

export const corpusById = (
  corpusId: number,
  subcorpusId: number | null | undefined = null,
) =>
  queryOptions({
    queryKey: ['corpus', corpusId],
    queryFn: async ({ signal }) => {
      if (subcorpusId === null) {
        return apiClient.get('/corpus/:id', {
          params: { id: String(corpusId) },
          signal,
        })
      }
      const subcorpusData = await apiClient.get(
        '/corpus/:id/subcorpus/:subcorpus_id',
        {
          params: { id: String(corpusId), subcorpus_id: String(subcorpusId) },
          signal,
        },
      )
      return {
        ...subcorpusData.corpus,
        ...subcorpusData,
      }
    },
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

export const subcorpusCollections = (corpusId: number, subcorpusId?: number) =>
  queryOptions({
    queryKey: ['subcorpus-collections', corpusId, subcorpusId],
    queryFn: ({ signal }) => {
      if (subcorpusId !== undefined) {
        throw new Error('Partitioning a subcorpus is not yet supported')
      }
      return apiClient.get('/corpus/:id/subcorpus-collection/', {
        params: { id: corpusId.toString() },
        signal,
      })
    },
  })

export const createSubcorpusCollection: MutationOptions<
  z.infer<typeof schemas.SubCorpusCollectionOut>,
  Error,
  z.infer<typeof schemas.SubCorpusCollectionIn> & {
    corpus_id: number
  }
> = {
  mutationFn: async ({ corpus_id, ...args }) => {
    return apiClient.put('/corpus/:id/subcorpus-collection/', args, {
      params: { id: corpus_id.toString() },
    })
  },
  onSuccess: (data) => {
    void queryClient.invalidateQueries({ queryKey: ['subcorpus-collections'] })
    void queryClient.invalidateQueries(corpusList)
    void queryClient.invalidateQueries(subcorporaList)
    void queryClient.invalidateQueries(corpusById(data.corpus?.id ?? -1))
  },
}

export const corpusMeta = (corpusId: number) =>
  queryOptions({
    queryKey: ['corpus-meta', corpusId],
    queryFn: ({ signal }) =>
      apiClient.get('/corpus/:id/meta/', {
        params: { id: corpusId.toString() },
        signal,
      }),
  })

export const corpusMetaFrequencies = (
  corpusId: number,
  level: string,
  key: string,
  {
    sortBy: sort_by = 'nr_tokens',
    sortOrder: sort_order = 'descending',
    pageSize: page_size = 10,
    nrBins: nr_bins = 30,
    timeInterval: time_interval = 'day',
  }: {
    sortBy?: 'nr_tokens' | 'nr_spans' | 'bin'
    sortOrder?: 'ascending' | 'descending'
    pageSize?: number
    nrBins?: number
    timeInterval?: 'hour' | 'day' | 'week' | 'month' | 'year'
  } = {},
) =>
  infiniteQueryOptions({
    // createAsIfNotExists is a hack to create a new meta key if it doesn't exist, should not be a dep
    // TODO: move this to the backend, probably
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      'corpus-meta-frequencies',
      corpusId,
      level,
      key,
      {
        sort_by,
        sort_order,
        page_size,
        nr_bins,
        time_interval,
      },
    ],
    queryFn: async ({ signal, pageParam }) =>
      apiClient.get('/corpus/:id/meta/frequencies', {
        params: { id: corpusId.toString() },
        queries: {
          level,
          key,
          sort_by,
          sort_order,
          page_size,
          page_number: pageParam,
          nr_bins,
          time_interval,
        },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page_number < lastPage.page_count
        ? lastPage.page_number + 1
        : undefined,
  })

export const corpusConcordances = (
  corpusId: number,
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
      'corpus-concordances',
      corpusId,
      {
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
    ],
    queryFn: ({ signal }) =>
      apiClient.get('/corpus/:id/concordance', {
        params: { id: corpusId.toString() },
        body: {
          corpus_id: corpusId,
          items: [filter_item],
          p: filter_item_p_att,
        },
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
        retry: 1,
      }),
  })

// ==================== USERS ====================

export const userIdentify = queryOptions({
  queryKey: ['session'],
  queryFn: ({ signal }) => apiClient.get('/user/identify', { signal }),
  retry: 1,
  staleTime: 0,
  gcTime: 0,
  refetchOnWindowFocus: true,
  refetchInterval: 60_000,
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
    void queryClient.invalidateQueries(userIdentify)
  },
}

export const usersList = queryOptions({
  queryKey: ['all-users'],
  queryFn: ({ signal }) => apiClient.get('/user/', { signal }),
  staleTime: 0,
  refetchOnWindowFocus: true,
})

export const logOut: MutationOptions = {
  mutationFn: async () => {
    localStorage.removeItem('access-token')
    localStorage.removeItem('refresh-token')
  },
  onSuccess: () => {
    queryClient.setQueryData(userIdentify.queryKey, null)
    void queryClient.invalidateQueries(userIdentify)
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

export const deleteKeywordAnalysis: MutationOptions<
  unknown,
  Error,
  { analysisId: number }
> = {
  mutationFn: ({ analysisId }) =>
    apiClient.delete('/keyword/:id/', undefined, {
      params: { id: analysisId.toString() },
    }),
  onSettled: () => {
    void queryClient.invalidateQueries(keywordAnalysesList)
  },
}

export const keywordAnalysisItemsById = (
  keywordAnalysisId: number,
  {
    sortOrder = 'descending',
    sortBy = 'conservative_log_ratio',
    pageSize = 10,
    pageNumber = 1,
  }: {
    sortOrder?: 'ascending' | 'descending'
    sortBy?: SortBy
    pageSize?: number
    pageNumber?: number
  } = {},
) =>
  queryOptions({
    queryKey: [
      'keyword-analysis-items',
      keywordAnalysisId,
      {
        sortOrder,
        sortBy,
        pageSize,
        pageNumber,
      },
    ],
    queryFn: ({ signal }) =>
      apiClient.get('/keyword/:id/items', {
        params: { id: keywordAnalysisId.toString() },
        queries: {
          sort_order: sortOrder,
          sort_by: sortBy,
          page_size: pageSize,
          page_number: pageNumber,
        },
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
