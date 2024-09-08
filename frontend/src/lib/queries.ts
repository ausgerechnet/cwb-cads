import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient, queryClient, schemas } from '@/rest-client'
import { arraysContainEqualItems } from './arrays-contain-equal-items'

type SortBy =
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

// ==================== QUERIES ====================
export const queriesList = queryOptions({
  queryKey: ['queries'],
  queryFn: ({ signal }) => apiClient.getQuery({ signal }),
  placeholderData: [],
})

export const queryById = (queryId: number) =>
  queryOptions({
    queryKey: ['query', queryId],
    queryFn: ({ signal }) =>
      apiClient.getQueryId({ params: { id: String(queryId) }, signal }),
  })

export const createQueryCQP: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryIn>
> = {
  mutationFn: (body) => apiClient.postQuery(body),
  onSuccess: () => {
    void queryClient.invalidateQueries(queriesList)
  },
}

export const createQueryAssisted: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  z.infer<typeof schemas.QueryAssistedIn>
> = {
  mutationFn: (body) => apiClient.postQueryassisted(body),
  onSuccess: () => {
    void queryClient.invalidateQueries(queriesList)
  },
}

export const deleteQuery: MutationOptions<unknown, Error, string> = {
  mutationFn: (queryId: string) =>
    apiClient.deleteQueryId(undefined, { params: { id: queryId } }),
  onSuccess: () => {
    void queryClient.invalidateQueries(queriesList)
  },
}

export const queryBreakdownForP = (queryId: number, p: string) =>
  queryOptions({
    queryKey: ['query-breakdown', queryId, p],
    queryFn: async () =>
      apiClient.getQueryQuery_idbreakdown({
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
      apiClient.getQueryQuery_idconcordance({
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
    staleTime: 1_000 * 60 * 5, // 5 minutes
  })

export const shuffleQueryConcordances: MutationOptions<
  z.infer<typeof schemas.QueryOut>,
  Error,
  number
> = {
  mutationFn: (queryId) =>
    apiClient.postQueryQuery_idconcordanceshuffle(undefined, {
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

export const subcorpusOf = (corpusId: number) =>
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
        await apiClient.putCorpusIdmeta(
          { level, key, value_type: createAsIfNotExists },
          { params: { id: corpusId.toString() } },
        )
        return await getFrequencies()
      }
      function getFrequencies() {
        return apiClient.getCorpusIdmetafrequencies({
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
    void queryClient.invalidateQueries(sessionQueryOptions)
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
  queryFn: ({ signal }) => apiClient.getMmdadiscourseme({ signal }),
})

export const discoursemeById = (discoursemeId: number) =>
  queryOptions({
    queryKey: ['discourseme', discoursemeId],
    queryFn: ({ signal }) =>
      apiClient.getMmdadiscoursemeId({
        params: { id: String(discoursemeId) },
        signal,
      }),
  })

export const createDiscourseme: MutationOptions<
  z.infer<typeof schemas.DiscoursemeOut>,
  Error,
  z.infer<typeof schemas.DiscoursemeIn>
> = {
  mutationFn: (body) => apiClient.postMmdadiscourseme(body),
  onSuccess: () => {
    void queryClient.invalidateQueries(discoursemesList)
  },
}

export const deleteDiscourseme: MutationOptions<unknown, Error, string> = {
  mutationFn: (discoursemeId: string) =>
    apiClient.deleteMmdadiscoursemeId(undefined, {
      params: { id: discoursemeId },
    }),
  onSettled: () => {
    void queryClient.invalidateQueries(discoursemesList)
  },
}

export const discoursemeDescriptionsById = (discoursemeId: number) =>
  queryOptions({
    queryKey: ['discourseme-descriptions', discoursemeId],
    queryFn: ({ signal }) =>
      apiClient.getMmdadiscoursemeIddescription({
        params: { id: discoursemeId.toString() },
        signal,
      }),
  })

export const addDiscoursemeDescription: MutationOptions<
  z.infer<typeof schemas.DiscoursemeDescriptionOut>,
  Error,
  z.infer<typeof schemas.DiscoursemeDescriptionIn> & { discourseme_id: number }
> = {
  mutationFn: ({ discourseme_id, ...body }) =>
    apiClient.postMmdadiscoursemeIddescription(body, {
      params: { id: discourseme_id.toString() },
    }),
  onSettled: (data) => {
    const discoursemeId = data?.discourseme_id
    if (discoursemeId === undefined) return
    void queryClient.invalidateQueries(discoursemeById(discoursemeId))
  },
}

export const deleteDiscoursemeDescription: MutationOptions<
  unknown,
  Error,
  { discoursemeId: number; descriptionId: number }
> = {
  mutationFn: ({ discoursemeId, descriptionId }) =>
    apiClient.deleteMmdadiscoursemeIddescriptionDescription_id(undefined, {
      params: {
        id: discoursemeId.toString(),
        description_id: descriptionId.toString(),
      },
    }),
  onSettled: () => {
    void queryClient.invalidateQueries({
      queryKey: ['discourseme-descriptions'],
    })
  },
}

// TODO: backend: Isn't "p" unnecessary, because it's already a part of the description?
// TODO: backend: cqp_query should be created on the backend
// TODO: backend: I think the "discourseme_id" could be inferred from the description
export const addDescriptionItem: MutationOptions<
  z.infer<typeof schemas.DiscoursemeDescriptionOut>,
  Error,
  {
    discoursemeId: number
    descriptionId: number
    cqpQuery: string
    p: string
    surface: string
  }
> = {
  mutationFn({ discoursemeId, descriptionId, cqpQuery, p, surface }) {
    return apiClient.patch(
      '/mmda/discourseme/:id/description/:description_id/add-item',
      { cqp_query: cqpQuery, p, surface },
      {
        params: {
          id: discoursemeId.toString(),
          description_id: descriptionId.toString(),
        },
      },
    )
  },
  onSettled(discoursemeDescription) {
    const discoursemeId = discoursemeDescription?.discourseme_id
    if (discoursemeId === undefined) return
    void queryClient.invalidateQueries({
      queryKey: ['collocation-items'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description'],
    })
    void queryClient.invalidateQueries(discoursemeById(discoursemeId))
    void queryClient.invalidateQueries(
      discoursemeDescriptionsById(discoursemeId),
    )
  },
}

// TODO: backend: Isn't "p" unnecessary, because it's already a part of the description?
// TODO: backend: I think the "discourseme_id" could be inferred from the description
// TODO: cqpQuery is not used... seems not necessary (and it should not), but I am unsure.
export const removeDescriptionItem: MutationOptions<
  z.infer<typeof schemas.DiscoursemeDescriptionOut>,
  Error,
  {
    discoursemeId: number
    descriptionId: number
    // cqpQuery: string
    p: string
    surface: string
  }
> = {
  mutationFn({
    discoursemeId,
    descriptionId,
    // cqpQuery,
    p,
    surface,
  }) {
    return apiClient.patch(
      '/mmda/discourseme/:id/description/:description_id/remove-item',
      { p, surface },
      {
        params: {
          id: discoursemeId.toString(),
          description_id: descriptionId.toString(),
        },
      },
    )
  },
  onSettled(discoursemeDescription) {
    const discoursemeId = discoursemeDescription?.discourseme_id
    if (discoursemeId === undefined) return
    void queryClient.invalidateQueries({
      queryKey: ['collocation-items'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description'],
    })
    void queryClient.invalidateQueries(discoursemeById(discoursemeId))
    void queryClient.invalidateQueries(
      discoursemeDescriptionsById(discoursemeId),
    )
  },
}
// =================== CONSTELLATIONS ====================

export const constellationList = queryOptions({
  queryKey: ['constellation-list'],
  queryFn: ({ signal }) => apiClient.getMmdaconstellation({ signal }),
})

export const constellationById = (constellationId: number) =>
  queryOptions({
    queryKey: ['constellation', constellationId],
    queryFn: ({ signal }) =>
      apiClient.getMmdaconstellationId({
        params: { id: constellationId.toString() },
        signal,
      }),
  })

export const createConstellation: MutationOptions<
  z.infer<typeof schemas.ConstellationOut>,
  Error,
  z.infer<typeof schemas.ConstellationIn>
> = {
  mutationFn: (body) => apiClient.postMmdaconstellation(body),
  onSettled: () => {
    void queryClient.invalidateQueries(constellationList)
  },
}

export const deleteConstellation: MutationOptions<unknown, Error, string> = {
  mutationFn: (constellationId: string) =>
    apiClient.deleteMmdaconstellationId(undefined, {
      params: { id: constellationId },
    }),
  onSettled: () => {
    void queryClient.invalidateQueries(constellationList)
  },
}

export const constellationDescriptionsById = (constellationId: number) =>
  queryOptions({
    queryKey: ['constellation-description-list', constellationId],
    queryFn: ({ signal }) =>
      apiClient.getMmdaconstellationIddescription({
        params: { id: constellationId.toString() },
        signal,
      }),
  })

export const constellationDescriptionFor = ({
  constellationId,
  corpusId,
  subcorpusId = null,
  matchStrategy,
  s,
}: {
  constellationId: number
  corpusId: number
  subcorpusId?: number | null
  matchStrategy: 'longest' | 'shortest' | 'standard'
  s?: string
}) =>
  queryOptions({
    queryKey: [
      'constellation-description',
      constellationId,
      corpusId,
      subcorpusId,
      matchStrategy,
      s,
    ],
    // TODO: This should all probably be done on the backend
    queryFn: async ({ signal }) => {
      const getMatchingDescription = async () => {
        // We need these to filter out the correct description
        const discoursemeIds = (
          await apiClient.getMmdaconstellationId({
            params: { id: constellationId.toString() },
            signal,
          })
        ).discoursemes.map((d) => d.id)
        console.log('discourseme ids for constellation:', discoursemeIds)
        const constellationDescriptions =
          await apiClient.getMmdaconstellationIddescription({
            params: { id: constellationId.toString() },
            signal,
          })
        console.log('found possible descriptions', constellationDescriptions)
        const matchingDescriptions = constellationDescriptions.filter(
          (cd) =>
            cd.corpus_id === corpusId &&
            (cd.subcorpus_id ?? null) === (subcorpusId ?? null) &&
            cd.s === s &&
            cd.match_strategy === matchStrategy &&
            // TODO: cd.discourseme_ids is always empty
            arraysContainEqualItems(
              discoursemeIds,
              cd.discourseme_descriptions.map((d) => d.discourseme_id),
            ),
        )
        console.log(
          `found ${matchingDescriptions.length} matching descriptions`,
          matchingDescriptions,
          matchingDescriptions.map((d) => d.id).join(', '),
        )
        return matchingDescriptions[0]
      }
      const description = await getMatchingDescription()
      console.log('found matching description')
      if (description) return description
      await apiClient.postMmdaconstellationIddescription(
        {
          corpus_id: corpusId,
          subcorpus_id: subcorpusId ?? undefined,
          s,
          match_strategy: matchStrategy,
        },
        { params: { id: constellationId.toString() }, signal },
      )
      return await getMatchingDescription()
    },
  })

export const constellationConcordances = (
  constellationId: number,
  descriptionId: number,
  focusDiscoursemeId: number,
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
      constellationId,
      descriptionId,
      focusDiscoursemeId,
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
      apiClient.getMmdaconstellationIddescriptionDescription_idconcordance({
        params: {
          id: constellationId.toString(),
          description_id: descriptionId.toString(),
        },
        queries: {
          focus_discourseme_id: focusDiscoursemeId,
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
  descriptionId: number,
  {
    focusDiscoursemeId,
    filterItem,
    filterItemPAttribute,
    marginals = 'local',
    p,
    sBreak,
    semanticMapId,
    window,
  }: {
    focusDiscoursemeId: number
    filterItem: string
    filterItemPAttribute: string
    marginals?: 'local' | 'global'
    p: string
    sBreak: string
    semanticMapId?: number
    window: number
  },
) =>
  queryOptions({
    queryKey: [
      'constellation-collocations',
      constellationId,
      descriptionId,
      filterItem,
      filterItemPAttribute,
      marginals,
      p,
      sBreak,
      semanticMapId,
      window,
      focusDiscoursemeId,
    ],
    staleTime: 1_000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const collocationAnalyses =
        await apiClient.getMmdaconstellationIddescriptionDescription_idcollocation(
          {
            params: {
              id: constellationId.toString(),
              description_id: descriptionId.toString(),
            },
          },
        )
      const matchingAnalysis = collocationAnalyses.find(
        (analysis) =>
          analysis.filter_item === filterItem &&
          analysis.filter_item_p_att === filterItemPAttribute &&
          analysis.focus_discourseme_id === focusDiscoursemeId &&
          analysis.p === p &&
          analysis.s_break === sBreak &&
          (analysis.semantic_map_id ?? null) === (semanticMapId ?? null) &&
          analysis.window === window,
      )
      console.group('constellationCollocation')
      console.log('found analyses:', collocationAnalyses)
      console.log('matching analysis:', matchingAnalysis)
      console.log('parameters', {
        constellationId,
        descriptionId,
        filterItem,
        filterItemPAttribute,
        focusDiscoursemeId,
        marginals,
        p,
        sBreak,
        semanticMapId,
        window,
      })
      console.groupEnd()
      if (matchingAnalysis) return matchingAnalysis
      return apiClient.postMmdaconstellationIddescriptionDescription_idcollocation(
        {
          filter_item: filterItem,
          filter_item_p_att: filterItemPAttribute,
          focus_discourseme_id: focusDiscoursemeId,
          marginals,
          p,
          s_break: sBreak,
          semantic_map_id: semanticMapId,
          window,
        },
        {
          params: {
            id: constellationId.toString(),
            description_id: descriptionId.toString(),
          },
        },
      )
    },
    select: (data) => {
      return data
    },
  })

export const removeConstellationDiscourseme: MutationOptions<
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
    apiClient.patch(
      '/mmda/constellation/:id/remove-discourseme',
      { discourseme_ids: [discoursemeId] },
      {
        params: {
          id: constellationId.toString(),
        },
      },
    ),
  onSuccess: (constellation) => {
    const constellationId = constellation.id
    console.log('deleted something from constellation', constellation)
    if (constellationId === undefined) return
    void queryClient.invalidateQueries(constellationById(constellationId))
    void queryClient.invalidateQueries({
      queryKey: ['query-concordances', String(constellationId)],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description'],
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
    apiClient.patch(
      '/mmda/constellation/:id/add-discourseme',
      { discourseme_ids: [discoursemeId] },
      {
        params: { id: constellationId.toString() },
      },
    ),
  onSuccess: (constellation) => {
    const constellationId = constellation.id
    if (constellationId === undefined) return
    void queryClient.invalidateQueries(constellationById(constellationId))
    void queryClient.invalidateQueries({
      queryKey: ['query-concordances', constellationId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description'],
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

// TODO: backend - the constellationId should be inferred from the description; ideally the end point would just take in the descriptionId and the surfaces
export const createDiscoursemeForConstellationDescription: MutationOptions<
  z.infer<typeof schemas.ConstellationDescriptionOutUpdate>,
  Error,
  {
    constellationId: number
    constellationDescriptionId: number
    surfaces: string[]
  }
> = {
  mutationFn: async ({
    constellationDescriptionId,
    constellationId,
    surfaces,
  }) => {
    console.log('create discourseme for constellation description', {
      constellationId,
      constellationDescriptionId,
      surfaces,
    })
    const constellationDescription =
      await apiClient.getMmdaconstellationIddescriptionDescription_id({
        params: {
          id: constellationId.toString(),
          description_id: constellationDescriptionId.toString(),
        },
      })

    const { corpus_id, subcorpus_id } = constellationDescription
    // TODO: brittle!
    const p = constellationDescription.discourseme_descriptions[0].items.find(
      ({ p }) => p !== null && p !== undefined,
    )?.p
    if (p === null || p === undefined) {
      throw new Error('p is null or undefined for this description')
    }

    const newDiscourseme = await apiClient.postMmdadiscourseme({
      name: 'New Discourseme',
      comment: '',
      template: surfaces.map((surface) => ({
        surface,
        p,
        cqp_query: `[${p}="${surface}"]`,
      })),
    })

    await apiClient.patch(
      `/mmda/constellation/:id/add-discourseme`,
      { discourseme_ids: [newDiscourseme.id] },
      {
        params: { id: constellationId.toString() },
      },
    )

    const newDiscoursemeDescription =
      await apiClient.postMmdadiscoursemeIddescription(
        // '/mmda/discourseme/:id/description/',
        {
          corpus_id,
          subcorpus_id: subcorpus_id ?? undefined,
          items: surfaces.map((surface) => ({
            surface,
            p,
          })),
        },
        {
          params: { id: newDiscourseme.id.toString() },
        },
      )

    return await apiClient.patch(
      '/mmda/constellation/:id/description/:description_id/add-discourseme',
      {
        discourseme_description_ids: [newDiscoursemeDescription.id],
      },
      {
        params: {
          id: constellationId.toString(),
          description_id: constellationDescriptionId.toString(),
        },
      },
    )
  },
  onSettled: function (constellationDescriptionUpdate) {
    constellationDescriptionUpdate?.discourseme_descriptions?.forEach(
      (discoursemeDescription) => {
        void queryClient.invalidateQueries(
          discoursemeDescriptionsById(discoursemeDescription.discourseme_id),
        )
      },
    )
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocations'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-concordances'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['collocation-items'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['collocation'],
    })
  },
}

// ================== COLLOCATION ANALYSIS ==================

export const collocationItemsById = (
  collocationId: number,
  {
    sortOrder,
    sortBy,
    pageSize,
    pageNumber,
  }: {
    sortOrder?: 'ascending' | 'descending'
    sortBy?: SortBy
    pageSize?: number
    pageNumber?: number
  },
) =>
  queryOptions({
    queryKey: [
      'collocation-items',
      collocationId,
      sortOrder,
      sortBy,
      pageSize,
      pageNumber,
    ],
    queryFn: ({ signal }) =>
      apiClient.getCollocationIditems({
        params: { id: collocationId.toString() },
        queries: {
          sort_order: sortOrder,
          sort_by: sortBy,
          page_size: pageSize,
          page_number: pageNumber,
        },
        signal,
      }),
  })

// ==================== KEYWORD ANALYSIS ====================

export const keywordAnalysesList = queryOptions({
  queryKey: ['keyword-analyses-list'],
  queryFn: ({ signal }) => apiClient.getKeyword({ signal }),
})

export const keywordAnalysisById = (keywordAnalysisId: number) =>
  queryOptions({
    queryKey: ['keyword-analysis', keywordAnalysisId],
    queryFn: ({ signal }) =>
      apiClient.getKeywordId({
        params: { id: keywordAnalysisId.toString() },
        signal,
      }),
  })

export const createKeywordAnalysis: MutationOptions<
  z.infer<typeof schemas.KeywordOut>,
  Error,
  z.infer<typeof schemas.KeywordIn>
> = {
  mutationFn: (body) => apiClient.postKeyword(body),
  onSettled: () => {
    void queryClient.invalidateQueries(keywordAnalysesList)
  },
}
