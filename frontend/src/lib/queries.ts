import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient, queryClient, schemas } from '@/rest-client'

// ==================== QUERIES ====================
// "queries" as in "cqp queries", but "query" as in "react-query"
export const queriesList = queryOptions({
  queryKey: ['queries'],
  queryFn: ({ signal }) => apiClient.getQuery({ signal }),
  placeholderData: [],
})

export const queryById = (queryId: string) =>
  queryOptions({
    queryKey: ['query', queryId],
    queryFn: ({ signal }) =>
      apiClient.getQueryId({ params: { id: queryId }, signal }),
    placeholderData: {},
  })

export const patchQuery: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  { queryId: string; discourseme_id: number | undefined }
> = {
  mutationFn: async ({ queryId }) => {
    // TODO: implement patchQueryMutationOptions
    console.warn('Query Patch is not implemented yet')
    const mockResponse: z.infer<typeof schemas.QueryOut> = {
      id: parseInt(queryId),
      corpus: {
        id: 1,
        name: 'corpus',
      },
    }
    return mockResponse
  },
  onSuccess: (data) => {
    const queryId = data.id
    if (queryId !== undefined) {
      queryClient.invalidateQueries(queryById(queryId.toString()))
    }
    queryClient.invalidateQueries(queriesList)
  },
}

export const executeQuery: MutationOptions<unknown, Error, string> = {
  mutationFn: (queryId: string) =>
    apiClient.postQueryIdexecute(undefined, { params: { id: queryId } }),
  onSuccess: () => queryClient.invalidateQueries(queriesList),
}

export const createQueryCQP: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryIn>
> = {
  mutationFn: (body) => apiClient.postQuery(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesList)
  },
}

export const createQueryAssisted: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryAssistedIn>
> = {
  mutationFn: (body) => apiClient.postQueryassisted(body),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesList)
  },
}

export const deleteQuery: MutationOptions<unknown, Error, string> = {
  mutationFn: (queryId: string) =>
    apiClient.deleteQueryId(undefined, { params: { id: queryId } }),
  onSuccess: () => {
    queryClient.invalidateQueries(queriesList)
  },
}

export const queryBreakdownForP = (queryId: string, p: string) =>
  queryOptions({
    queryKey: ['query-breakdown', queryId, p],
    queryFn: async () =>
      apiClient.getQueryQuery_idbreakdown({
        queries: { p },
        params: { query_id: queryId },
      }),
  })

export const queryConcordances = (
  queryId: string,
  {
    window,
    primary,
    secondary,
    filterItem: filter_item,
    filterItemPAtt: filter_item_p_att,
    filterDiscoursemeIds: filter_discourseme_ids,
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
    filterDiscoursemeIds?: number[]
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
      filter_discourseme_ids,
      page_size,
      page_number,
      sort_order,
      sort_by_offset,
    ],
    queryFn: ({ signal }) =>
      apiClient.getQueryQuery_idconcordance({
        params: { query_id: queryId },
        queries: {
          window,
          primary,
          secondary,
          filter_item,
          filter_item_p_att,
          filter_discourseme_ids,
          page_size,
          page_number,
          sort_order,
          sort_by_offset,
        },
        signal,
      }),
    staleTime: 1_000 * 60 * 5, // 5 minutes
  })

// export const queryConcordanceContextQueryOptions = (
//   queryId: string,
//   concordanceLineId: string,
//   {
//     window,
//     extendedWindow: extended_window,
//     extendedContextBreak: extended_context_break,
//     primary,
//     secondary,
//   }: {
//     window?: number
//     extendedWindow?: number
//     extendedContextBreak?: string
//     primary?: string
//     secondary?: string
//   } = {},
// ) =>
//   queryOptions({
//     queryKey: [
//       'query-concordance-context',
//       queryId,
//       concordanceLineId,
//       window,
//       extended_window,
//       extended_context_break,
//       primary,
//       secondary,
//     ],
//     queryFn: ({ signal }) =>
//       apiClient.getQueryQuery_idconcordanceId({
//         params: { query_id: queryId, id: concordanceLineId },
//         queries: {
//           window,
//           extended_window,
//           extended_context_break,
//           primary,
//           secondary,
//         },
//         signal,
//       }),
//     staleTime: 1_000 * 60 * 5, // 5 minutes
//   })

export const shuffleQueryConcordances: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  string
> = {
  mutationFn: (queryId) =>
    apiClient.postQueryQuery_idconcordanceshuffle(undefined, {
      params: { query_id: queryId },
    }),
  onSuccess: (data) => {
    const queryId =
      // TODO: QueryOut should have more mandatory fields
      data.query_id === undefined ? undefined : (data.id ?? '').toString()
    if (queryId === undefined) return
    queryClient.invalidateQueries(queryConcordances(queryId))
  },
}

export const queryCollocation = (
  queryId: string,
  p: string,
  window: number,
  {
    constellationId,
    semanticMapId,
    sBreak,
    marginals,
    filterItem,
    filterItemPAtt,
    filterDiscoursemeIds = [],
  }: {
    constellationId?: number | undefined
    semanticMapId?: number | undefined
    sBreak?: string | undefined
    marginals?: 'local' | 'global' | undefined
    filterItem?: string
    filterItemPAtt?: string
    filterDiscoursemeIds?: number[] | undefined
  } = {},
) =>
  queryOptions({
    queryKey: [
      'query-collocation',
      queryId,
      p,
      window,
      constellationId,
      semanticMapId,
      sBreak,
      marginals,
      filterItem,
      filterItemPAtt,
      filterDiscoursemeIds,
    ],
    queryFn: ({ signal }) =>
      apiClient.getQueryQuery_idcollocation({
        params: { query_id: queryId },
        queries: {
          p,
          window,
          constellation_id: constellationId,
          semantic_map_id: semanticMapId,
          s_break: sBreak,
          marginals,
          filter_item: filterItem,
          filter_item_p_att: filterItemPAtt,
          filter_discourseme_ids: filterDiscoursemeIds,
        },
        signal,
      }),
  })

// ==================== CORPORA ====================

export const corpusById = (corpusId: number) =>
  queryOptions({
    queryKey: ['corpus', corpusId],
    queryFn: ({ signal }) =>
      apiClient.getCorpusId({ params: { id: String(corpusId) }, signal }),
  })

export const corpusList = queryOptions({
  queryKey: ['corpora'],
  queryFn: ({ signal }) => apiClient.getCorpus({ signal }),
})

export const subcorporaList = queryOptions({
  queryKey: ['subcorpora'],
  queryFn: async ({ signal }) => {
    const corpora = await apiClient.getCorpus({ signal })
    return (
      await Promise.all(
        corpora.map(
          async (corpus) =>
            apiClient.getCorpusIdsubcorpus({
              params: { id: corpus.id?.toString() ?? '' },
            }),
          signal,
        ),
      )
    ).flat()
  },
})

export const subcorpusById = (corpusId: number) =>
  queryOptions({
    queryKey: ['subcorpora', corpusId],
    queryFn: ({ signal }) =>
      apiClient.getCorpusIdsubcorpus({
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
    apiClient.putCorpusIdsubcorpus(args, {
      params: { id: corpus_id.toString() },
    }),
  onSuccess: (data) => {
    queryClient.invalidateQueries(corpusList)
    queryClient.invalidateQueries(subcorporaList)
    queryClient.invalidateQueries(corpusById(data.corpus?.id ?? -1))
  },
}

export const updateSubcorpus: MutationOptions<unknown, Error, string> = {
  // TODO: implement correct API call
  mutationFn: async (id: string) => '42 ' + id,
  //   apiClient.putCorpusIdsubcorpus(undefined, { params: { id } }),
  onSuccess: () => {
    queryClient.invalidateQueries(corpusList)
    queryClient.invalidateQueries(subcorporaList)
  },
}

export const corpusMetaById = (corpusId: number) =>
  queryOptions({
    queryKey: ['corpus-meta', corpusId],
    queryFn: ({ signal }) =>
      apiClient.getCorpusIdmeta({
        params: { id: corpusId.toString() },
        signal,
      }),
  })

export const corpusMetaFrequencies = (
  corpusId: number,
  level: string,
  key: string,
) =>
  queryOptions({
    queryKey: ['corpus-meta-frequencies', corpusId, level, key],
    queryFn: ({ signal }) =>
      apiClient.getCorpusIdmetafrequencies({
        params: { id: corpusId.toString() },
        queries: { level, key },
        signal,
      }),
  })

// ==================== USERS ====================

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: ({ signal }) => apiClient.getUseridentify({ signal }),
  retry: 1,
})

export const logIn: MutationOptions<
  z.infer<typeof schemas.HTTPTokenOut>,
  Error,
  z.infer<typeof schemas.UserIn>
> = {
  mutationFn: (credentials) => apiClient.postUserlogin(credentials),
  onSuccess: ({ access_token, refresh_token }) => {
    if (access_token) {
      localStorage.setItem('access-token', access_token)
    }
    if (refresh_token) {
      localStorage.setItem('refresh-token', refresh_token)
    }
    queryClient.invalidateQueries(sessionQueryOptions)
  },
}

export const usersList = queryOptions({
  queryKey: ['all-users'],
  queryFn: ({ signal }) => apiClient.getUser({ signal }),
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

// ==================== DISCOURSEMES ====================

export const discoursemesList = queryOptions({
  queryKey: ['discoursemes'],
  queryFn: ({ signal }) => apiClient.getDiscourseme({ signal }),
})

export const discoursemeById = (discoursemeId: string) =>
  queryOptions({
    queryKey: ['discourseme', discoursemeId],
    queryFn: ({ signal }) =>
      apiClient.getDiscoursemeId({ params: { id: discoursemeId }, signal }),
  })

export const createDiscourseme: MutationOptions<
  z.infer<typeof schemas.DiscoursemeOut>,
  Error,
  z.infer<typeof schemas.DiscoursemeIn>
> = {
  mutationFn: (body) => apiClient.postDiscourseme(body),
  onSuccess: () => {
    queryClient.invalidateQueries(discoursemesList)
  },
}

export const deleteDiscourseme: MutationOptions<unknown, Error, string> = {
  mutationFn: (discoursemeId: string) =>
    apiClient.deleteDiscoursemeId(undefined, { params: { id: discoursemeId } }),
  onSettled: () => {
    queryClient.invalidateQueries(discoursemesList)
  },
}

// =================== CONSTELLATIONS ====================

export const constellationList = queryOptions({
  queryKey: ['constellation-list'],
  queryFn: ({ signal }) => apiClient.getConstellation({ signal }),
})

export const constellationById = (constellationId: string) =>
  queryOptions({
    queryKey: ['constellation', constellationId],
    queryFn: ({ signal }) =>
      apiClient.getConstellationId({ params: { id: constellationId }, signal }),
  })

export const createConstellation: MutationOptions<
  z.infer<typeof schemas.ConstellationOut>,
  Error,
  z.infer<typeof schemas.ConstellationIn>
> = {
  mutationFn: (body) => apiClient.postConstellation(body),
  onSuccess: () => {
    queryClient.invalidateQueries(constellationList)
  },
}

export const deleteConstellation: MutationOptions<unknown, Error, string> = {
  mutationFn: (constellationId: string) =>
    apiClient.deleteConstellationId(undefined, {
      params: { id: constellationId },
    }),
  onSuccess: () => {
    queryClient.invalidateQueries(constellationList)
  },
}

export const constellationConcordances = (
  constellationId: string | number,
  corpusId: string | number,
  {
    window,
    primary,
    secondary,
    filterItem: filter_item,
    filterItemPAtt: filter_item_p_att,
    filterDiscoursemeIds: filter_discourseme_ids,
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
    filterDiscoursemeIds?: number[]
    pageSize?: number
    pageNumber?: number
    sortOrder?: 'ascending' | 'descending' | 'random'
    sortByOffset?: number
  } = {},
) =>
  queryOptions({
    queryKey: [
      'constellation-concordances',
      String(constellationId),
      String(corpusId),
      window,
      primary,
      secondary,
      filter_item,
      filter_item_p_att,
      filter_discourseme_ids,
      page_size,
      page_number,
      sort_order,
      sort_by_offset,
    ],
    queryFn: ({ signal }) =>
      apiClient.getConstellationIdcorpusCorpus_idconcordance({
        params: { id: String(constellationId), corpus_id: String(corpusId) },
        queries: {
          window,
          primary,
          secondary,
          filter_item,
          filter_item_p_att,
          filter_discourseme_ids,
          page_size,
          page_number,
          sort_order,
          sort_by_offset,
        },
        signal,
      }),
    staleTime: 1_000 * 60 * 5, // 5 minutes
  })

export const constellationCollocation = (
  constellationId: number,
  corpusId: number,
  {
    p,
    window,
    semanticBreak,
    semanticMapId,
    subcorpusId,
    marginals,
    filterItem,
    filterItemPAtt,
    filterDiscoursemeIds,
  }: {
    p: string
    window: number
    semanticMapId?: number
    subcorpusId?: number
    semanticBreak?: string
    marginals?: 'local' | 'global'
    filterItem?: string
    filterItemPAtt?: string
    filterDiscoursemeIds?: number[]
  },
) =>
  queryOptions({
    queryKey: [
      'constellation-collocations',
      String(constellationId),
      String(corpusId),
      semanticMapId,
      subcorpusId,
      p,
      window,
      semanticBreak,
      marginals,
      filterItem,
      filterItemPAtt,
      filterDiscoursemeIds,
    ],
    queryFn: ({ signal }) =>
      apiClient.getConstellationIdcorpusCorpus_idcollocation({
        params: { id: String(constellationId), corpus_id: String(corpusId) },
        queries: {
          p,
          window,
          semantic_map_id: semanticMapId,
          subcorpus_id: subcorpusId,
          s_break: semanticBreak,
          marginals,
          filter_item: filterItem,
          filter_item_p_att: filterItemPAtt,
          filter_discourseme_ids: filterDiscoursemeIds,
        },
        signal,
      }),
    select: (data) => {
      return data
    },
  })

export const deleteConstellationDiscourseme: MutationOptions<
  z.infer<typeof schemas.ConstellationOut>,
  Error,
  { constellationId: number; discoursemeId: number }
> = {
  mutationFn: async ({
    constellationId,
    discoursemeId,
  }: {
    constellationId: number
    discoursemeId: number
  }) =>
    apiClient.patchConstellationIdremoveDiscourseme(
      { discourseme_id: discoursemeId },
      {
        params: { id: constellationId.toString() },
      },
    ),
  mutationKey: ['delete-constellation-discourseme'],
  onSuccess: (constellation) => {
    const constellationId = constellation.id
    if (constellationId === undefined) return
    queryClient.invalidateQueries(constellationById(String(constellationId)))
    queryClient.invalidateQueries({
      queryKey: ['query-concordances', String(constellationId)],
    })
  },
}

export const addConstellationDiscourseme: MutationOptions<
  z.infer<typeof schemas.ConstellationOut>,
  Error,
  { constellationId: number; discoursemeId: number }
> = {
  mutationFn: async ({
    constellationId,
    discoursemeId,
  }: {
    constellationId: number
    discoursemeId: number
  }) =>
    apiClient.patchConstellationIdaddDiscourseme(
      { discourseme_id: discoursemeId },
      {
        params: { id: constellationId.toString() },
      },
    ),
  mutationKey: ['add-constellation-discourseme'],
  onSuccess: (constellation) => {
    const constellationId = constellation.id
    if (constellationId === undefined) return
    queryClient.invalidateQueries(constellationById(String(constellationId)))
    queryClient.invalidateQueries({
      queryKey: ['query-concordances', String(constellationId)],
    })
  },
}
// ==================== COLLOCATIONS ====================

export const getCollocation = (id: number) =>
  queryOptions({
    queryKey: ['collocation', id],
    queryFn: ({ signal }) =>
      apiClient.getCollocationId({ params: { id: id.toString() }, signal }),
  })

export const getCollocationItems = (
  id: number,
  {
    sortOrder,
    sortBy,
    pageSize,
    pageNumber,
  }: {
    sortOrder?: 'ascending' | 'descending'
    sortBy?:
      | 'conservative_log_ratio'
      | 'O11'
      | 'E11'
      | 'ipm'
      | 'ipm_expected'
      | 'log_likelihood'
      | 'z_score'
      | 't_score'
      | 'simple_ll'
      | 'dice'
      | 'log_ratio'
      | 'min_sensitivity'
      | 'liddell'
      | 'mutual_information'
      | 'local_mutual_information'
    pageSize?: number
    pageNumber?: number
  } = {},
) =>
  queryOptions({
    queryKey: [
      'collocation-items',
      id,
      sortOrder,
      sortBy,
      pageSize,
      pageNumber,
    ],
    queryFn: ({ signal }) =>
      apiClient.getCollocationIditems({
        params: { id: id.toString() },
        queries: {
          sort_order: sortOrder,
          sort_by: sortBy,
          page_size: pageSize,
          page_number: pageNumber,
        },
        signal,
      }),
  })
