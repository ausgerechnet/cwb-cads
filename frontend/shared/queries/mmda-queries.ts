import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { queryClient } from './query-client'
import { apiClient, schemas } from '../api-client'
import { arraysContainEqualItems } from '../lib/arrays-contain-equal-items'

export type SortBy =
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

// ==================== DISCOURSEMES ====================
export const discoursemesList = queryOptions({
  queryKey: ['discoursemes'],
  queryFn: ({ signal }) => apiClient.get('/mmda/discourseme/', { signal }),
})

export const discoursemeById = (discoursemeId: number) =>
  queryOptions({
    queryKey: ['discourseme', discoursemeId],
    queryFn: ({ signal }) =>
      apiClient.get('/mmda/discourseme/:discourseme_id', {
        params: { discourseme_id: String(discoursemeId) },
        signal,
      }),
  })

export const createDiscourseme: MutationOptions<
  z.infer<typeof schemas.DiscoursemeOut>,
  Error,
  z.infer<typeof schemas.DiscoursemeIn>
> = {
  // @ts-expect-error - deeply nested types
  mutationFn: (body) => apiClient.post('/mmda/discourseme/', body),
  onSuccess: () => {
    void queryClient.invalidateQueries(discoursemesList)
  },
}

export const deleteDiscourseme: MutationOptions<unknown, Error, string> = {
  mutationFn: (discoursemeId: string) =>
    apiClient.delete('/mmda/discourseme/:discourseme_id', undefined, {
      params: { discourseme_id: discoursemeId },
    }),
  onSettled: () => {
    void queryClient.invalidateQueries(discoursemesList)
  },
}

export const updateDiscourseme: MutationOptions<
  z.infer<typeof schemas.DiscoursemeOut>,
  Error,
  {
    discoursemeId: number
    discoursemePatch: z.infer<typeof schemas.DiscoursemeInUpdate>
  }
> = {
  mutationFn: ({ discoursemeId, discoursemePatch }) =>
    apiClient.patch('/mmda/discourseme/:discourseme_id', discoursemePatch, {
      params: { discourseme_id: discoursemeId.toString() },
    }),
  onSuccess: (newDiscourseme) => {
    // TODO: Update the cache instead of invalidating it as soon as backend is fixed
    void queryClient.invalidateQueries(discoursemesList)
    void queryClient.invalidateQueries(discoursemeById(newDiscourseme.id))
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-visualisation-map'],
    })
  },
}

export const discoursemeDescriptionsById = (discoursemeId: number) =>
  queryOptions({
    queryKey: ['discourseme-descriptions', discoursemeId],
    queryFn: ({ signal }) =>
      apiClient.get('/mmda/discourseme/:discourseme_id/description/', {
        params: { discourseme_id: discoursemeId.toString() },
        signal,
      }),
  })

export const addDiscoursemeDescription: MutationOptions<
  z.infer<typeof schemas.DiscoursemeDescriptionOut>,
  Error,
  z.infer<typeof schemas.DiscoursemeDescriptionIn> & { discourseme_id: number }
> = {
  mutationFn: ({ discourseme_id, ...body }) =>
    apiClient.post('/mmda/discourseme/:discourseme_id/description/', body, {
      params: { discourseme_id: discourseme_id.toString() },
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
    apiClient.delete(
      '/mmda/discourseme/:discourseme_id/description/:description_id/',
      undefined,
      {
        params: {
          discourseme_id: discoursemeId.toString(),
          description_id: descriptionId.toString(),
        },
      },
    ),
  onSettled: () => {
    void queryClient.invalidateQueries({
      queryKey: ['discourseme-descriptions'],
    })
  },
}

// TODO: backend: the "discourseme_id" could be inferred from the description
export const addDescriptionItem: MutationOptions<
  z.infer<typeof schemas.DiscoursemeDescriptionOut>,
  Error,
  {
    discoursemeId: number
    descriptionId: number
    p: string
    surface: string
  }
> = {
  mutationFn({ discoursemeId, descriptionId, p, surface }) {
    return apiClient.patch(
      '/mmda/discourseme/:discourseme_id/description/:description_id/add-item',
      { p, surface },
      {
        params: {
          discourseme_id: discoursemeId.toString(),
          description_id: descriptionId.toString(),
        },
      },
    )
  },
  onSettled() {
    void queryClient.invalidateQueries({ queryKey: ['collocation-items'] })
    void queryClient.invalidateQueries({ queryKey: ['constellation'] })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description-associations'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-visualisation-map'],
    })
  },
}

// TODO: backend: I the "discourseme_id" could be inferred from the description
export const removeDescriptionItem: MutationOptions<
  z.infer<typeof schemas.DiscoursemeDescriptionOut>,
  Error,
  {
    discoursemeId: number
    descriptionId: number
    p: string
    surface: string
  }
> = {
  mutationFn({ discoursemeId, descriptionId, p, surface }) {
    return apiClient.patch(
      '/mmda/discourseme/:discourseme_id/description/:description_id/remove-item',
      { p, surface },
      {
        params: {
          discourseme_id: discoursemeId.toString(),
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
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description-associations'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-visualisation-map'],
    })
    void queryClient.invalidateQueries(discoursemeById(discoursemeId))
    void queryClient.invalidateQueries(
      discoursemeDescriptionsById(discoursemeId),
    )
  },
}

export const discoursemeDescriptionBreakdown = (
  discoursemeId: number,
  descriptionId: number,
  pAttribute: string,
) =>
  queryOptions({
    queryKey: [
      'discourseme-description-breakdown',
      discoursemeId,
      descriptionId,
      pAttribute,
    ],
    queryFn: ({ signal }) =>
      apiClient.get(
        '/mmda/discourseme/:discourseme_id/description/:description_id/breakdown',
        {
          signal,
          params: {
            discourseme_id: discoursemeId.toString(),
            description_id: descriptionId.toString(),
          },
          queries: { p: pAttribute },
        },
      ),
  })

export const constellationDescriptionAssociations = (
  constellationId: number,
  descriptionId: number,
) =>
  queryOptions({
    queryKey: [
      'constellation-description-associations',
      constellationId,
      descriptionId,
    ],
    queryFn: ({ signal }) =>
      apiClient.get(
        '/mmda/constellation/:constellation_id/description/:description_id/associations/',
        {
          signal,
          params: {
            constellation_id: constellationId.toString(),
            description_id: descriptionId.toString(),
          },
        },
      ),
  })

// =================== CONSTELLATIONS ====================

export const constellationList = queryOptions({
  queryKey: ['constellation-list'],
  queryFn: ({ signal }) => apiClient.get('/mmda/constellation/', { signal }),
})

export const constellationById = (constellationId: number) =>
  queryOptions({
    queryKey: ['constellation', constellationId],
    queryFn: ({ signal }) =>
      apiClient.get('/mmda/constellation/:constellation_id', {
        params: { constellation_id: constellationId.toString() },
        signal,
      }),
  })

export const createConstellation: MutationOptions<
  z.infer<typeof schemas.ConstellationOut>,
  Error,
  z.infer<typeof schemas.ConstellationIn>
> = {
  mutationFn: (body) => apiClient.post('/mmda/constellation/', body),
  onSettled: () => {
    void queryClient.invalidateQueries(constellationList)
  },
}

export const deleteConstellation: MutationOptions<unknown, Error, string> = {
  mutationFn: (constellationId: string) =>
    apiClient.delete('/mmda/constellation/:constellation_id', undefined, {
      params: { constellation_id: constellationId },
    }),
  onSettled: () => {
    void queryClient.invalidateQueries(constellationList)
  },
}

export const constellationDescriptionsById = (constellationId: number) =>
  queryOptions({
    queryKey: ['constellation-description-list', constellationId],
    queryFn: ({ signal }) =>
      apiClient.get('/mmda/constellation/:constellation_id/description/', {
        params: { constellation_id: constellationId.toString() },
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
      { constellationId, corpusId, subcorpusId, matchStrategy, s },
    ],
    // TODO: This should all probably be done on the backend
    queryFn: async ({ signal }) => {
      const getMatchingDescription = async () => {
        // We need these to filter out the correct description
        const discoursemeIds = (
          await apiClient.get('/mmda/constellation/:constellation_id', {
            params: { constellation_id: constellationId.toString() },
            signal,
          })
        ).discoursemes.map((d) => d.id)
        const constellationDescriptions = await apiClient.get(
          '/mmda/constellation/:constellation_id/description/',
          {
            params: { constellation_id: constellationId.toString() },
            signal,
          },
        )
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
        if (matchingDescriptions.length > 1) {
          console.warn('Found multiple matching descriptions!')
        }
        return matchingDescriptions[0]
      }
      const description = await getMatchingDescription()
      if (description) return description
      await apiClient.post(
        '/mmda/constellation/:constellation_id/description/',
        {
          corpus_id: corpusId,
          subcorpus_id: subcorpusId ?? undefined,
          s,
          match_strategy: matchStrategy,
        },
        { params: { constellation_id: constellationId.toString() }, signal },
      )
      return await getMatchingDescription()
    },
  })

export const constellationConcordanceContext = (
  constellationId: number,
  descriptionId: number,
  matchId: number,
  focus_discourseme_id: number,
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
      'constellation-concordance-context',
      constellationId,
      descriptionId,
      matchId,
      focus_discourseme_id,
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
      apiClient.get(
        '/mmda/constellation/:constellation_id/description/:description_id/concordance/:match_id',
        {
          params: {
            constellation_id: String(constellationId),
            description_id: String(descriptionId),
            match_id: String(matchId),
          },
          queries: {
            focus_discourseme_id,
            window,
            context_break,
            extended_window,
            extended_context_break,
            primary,
            secondary,
            highlight_query_ids,
          },
          signal,
        },
      ),
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
    sortByPAtt: sort_by_p_att,
  }: {
    window?: number
    primary?: string
    secondary?: string
    filterItem?: string
    filterItemPAtt?: string
    filterDiscoursemeIds?: number[]
    pageSize?: number
    pageNumber?: number
    sortOrder?: 'ascending' | 'descending' | 'random' | 'first'
    sortByOffset?: number
    sortByPAtt?: string
  } = {},
) =>
  queryOptions({
    queryKey: [
      'constellation-concordances',
      {
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
        sort_by_p_att,
      },
    ],
    queryFn: ({ signal }) =>
      apiClient.get(
        '/mmda/constellation/:constellation_id/description/:description_id/concordance/',
        {
          params: {
            constellation_id: constellationId.toString(),
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
            ...(sort_order === 'descending' || sort_order === 'ascending'
              ? {
                  sort_by_offset,
                  sort_by_p_att,
                }
              : {}),
          },
          signal,
        },
      ),
  })

export const constellationCollocation = (
  constellationId: number,
  descriptionId: number,
  {
    focusDiscoursemeId,
    filterDiscoursemeIds = [],
    marginals = 'local',
    p,
    sBreak,
    semanticMapId,
    window,
  }: {
    focusDiscoursemeId: number
    marginals?: 'local' | 'global'
    p: string
    sBreak: string
    semanticMapId?: number
    window: number
    filterDiscoursemeIds?: number[]
  },
) =>
  queryOptions({
    queryKey: [
      'constellation-collocations',
      {
        constellationId,
        descriptionId,
        filterDiscoursemeIds,
        marginals,
        p,
        sBreak,
        semanticMapId,
        window,
        focusDiscoursemeId,
      },
    ],
    staleTime: 1_000 * 60 * 5, // 5 minutes
    queryFn: async ({ signal }) => {
      return apiClient.put(
        '/mmda/constellation/:constellation_id/description/:description_id/collocation/',
        {
          focus_discourseme_id: focusDiscoursemeId,
          filter_discourseme_ids: filterDiscoursemeIds,
          marginals,
          p,
          s_break: sBreak,
          semantic_map_id: semanticMapId,
          window,
        },
        {
          params: {
            constellation_id: constellationId.toString(),
            description_id: descriptionId.toString(),
          },
          signal,
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
      '/mmda/constellation/:constellation_id/remove-discourseme',
      { discourseme_ids: [discoursemeId] },
      {
        params: {
          constellation_id: constellationId.toString(),
        },
      },
    ),
  onSuccess: (constellation) => {
    const constellationId = constellation.id
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
  z.infer<typeof schemas.ConstellationDescriptionOutUpdate>,
  Error,
  { constellationId: number; discoursemeId: number; descriptionId: number }
> = {
  mutationFn: async ({
    constellationId,
    discoursemeId,
  }: {
    constellationId: number
    discoursemeId: number
  }) =>
    apiClient.patch(
      '/mmda/constellation/:constellation_id/add-discourseme',
      { discourseme_ids: [discoursemeId] },
      {
        params: {
          constellation_id: constellationId.toString(),
        },
      },
    ),
  onSuccess: () => {
    void queryClient.invalidateQueries({
      queryKey: ['query-concordances'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-description'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-items'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-visualisation-map'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-visualisation-items'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocations'],
    })
    void queryClient.invalidateQueries({
      queryKey: ['constellation'],
    })
  },
}
// ==================== COLLOCATIONS ====================

export const getCollocation = (id: number) =>
  queryOptions({
    queryKey: ['collocation', id],
    queryFn: ({ signal }) =>
      apiClient.get('/collocation/:id/', {
        params: { id: id.toString() },
        signal,
      }),
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
      { sortOrder, sortBy, pageSize, pageNumber },
    ],
    queryFn: ({ signal }) =>
      apiClient.get('/collocation/:id/items', {
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
// TODO: backend - p should probably also be inferred
export const createDiscoursemeForConstellationDescription: MutationOptions<
  z.infer<typeof schemas.ConstellationDescriptionOutUpdate>,
  Error,
  {
    constellationId: number
    constellationDescriptionId: number
    p: string
    surfaces: string[]
    comment?: string
    name?: string
  }
> = {
  mutationFn: async ({
    constellationDescriptionId,
    constellationId,
    p,
    surfaces,
    comment = '',
    name = 'New Discourseme',
  }) =>
    apiClient.post(
      '/mmda/constellation/:constellation_id/description/:description_id/discourseme-description',
      {
        name,
        comment,
        template: surfaces.map((surface) => ({
          surface,
          p,
        })),
      },
      {
        params: {
          description_id: constellationDescriptionId.toString(),
          constellation_id: constellationId.toString(),
        },
      },
    ),
  onSettled: (constellationDescriptionUpdate) => {
    constellationDescriptionUpdate?.discourseme_descriptions?.forEach(
      (discoursemeDescription) => {
        void queryClient.invalidateQueries(
          discoursemeDescriptionsById(discoursemeDescription.discourseme_id),
        )
      },
    )
    void queryClient.invalidateQueries({
      queryKey: ['constellation-collocation-visualisation-map'],
    })
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

// TODO: If the collocationId is unique, maybe one can omit the constellationId and the descriptionId?
export const constellationCollocationItems = (
  constellationId: number,
  descriptionId: number,
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
    retry: 0,
    queryKey: [
      'constellation-collocation-items',
      {
        constellationId,
        descriptionId,
        collocationId,
        sortOrder,
        sortBy,
        pageSize,
        pageNumber,
      },
    ],
    queryFn: ({ signal }) =>
      apiClient.get(
        '/mmda/constellation/:constellation_id/description/:description_id/collocation/:collocation_id/items',
        {
          params: {
            constellation_id: constellationId.toString(),
            description_id: descriptionId.toString(),
            collocation_id: collocationId.toString(),
          },
          queries: {
            sort_order: sortOrder,
            sort_by: sortBy,
            page_size: pageSize,
            page_number: pageNumber,
          },
          signal,
        },
      ),
  })

export const constellationCollocationVisualisation = (
  constellationId: number,
  descriptionId: number,
  collocationId: number,
  {
    sortOrder,
    sortBy,
  }: {
    sortOrder?: 'ascending' | 'descending'
    sortBy?: SortBy
  },
) =>
  queryOptions({
    retry: 0,
    queryKey: [
      'constellation-collocation-visualisation-map',
      {
        descriptionId,
        constellationId,
        collocationId,
        sortOrder,
        sortBy,
      },
    ],
    queryFn: async ({ signal }) =>
      apiClient.get(
        '/mmda/constellation/:constellation_id/description/:description_id/collocation/:collocation_id/map',
        {
          params: {
            constellation_id: constellationId.toString(),
            description_id: descriptionId.toString(),
            collocation_id: collocationId.toString(),
          },
          queries: {
            sort_order: sortOrder,
            sort_by: sortBy,
            page_size: 300,
            page_number: 1,
          },
          signal,
        },
      ),
  })
