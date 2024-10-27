import { queryOptions, MutationOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { queryClient } from './query-client'
import { apiClient, schemas } from '../api-client'
import { arraysContainEqualItems } from '../lib/arrays-contain-equal-items'

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
// TODO: backend: I think the "discourseme_id" could be inferred from the description
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
      '/mmda/discourseme/:id/description/:description_id/add-item',
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

// TODO: backend: Isn't "p" unnecessary, because it's already a part of the description?
// TODO: backend: I think the "discourseme_id" could be inferred from the description
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
        const constellationDescriptions =
          await apiClient.getMmdaconstellationIddescription({
            params: { id: constellationId.toString() },
            signal,
          })
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
    sortOrder?: 'ascending' | 'descending' | 'random' | 'first'
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
  onSettled: (constellationDescriptionUpdate) => {
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
    queryKey: [
      'constellation-collocation-items',
      constellationId,
      descriptionId,
      collocationId,
      sortOrder,
      sortBy,
      pageSize,
      pageNumber,
    ],
    queryFn: ({ signal }) =>
      apiClient.getMmdaconstellationIddescriptionDescription_idcollocationCollocation_iditems(
        {
          params: {
            id: constellationId.toString(),
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
