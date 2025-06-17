import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

const CollocationOut = z
  .object({
    id: z.number().int(),
    marginals: z.string(),
    nr_items: z.number().int(),
    p: z.string(),
    query_id: z.number().int(),
    s_break: z.string(),
    semantic_map_id: z.number().int().nullable(),
    window: z.number().int(),
  })
  .passthrough()
const HTTPError = z
  .object({ detail: z.object({}).partial().passthrough(), message: z.string() })
  .partial()
  .passthrough()
const CoordinatesOut = z
  .object({
    item: z.string(),
    semantic_map_id: z.number().int(),
    x: z.number(),
    x_user: z.number().nullable(),
    y: z.number(),
    y_user: z.number().nullable(),
  })
  .passthrough()
const CollocationScoreOut = z
  .object({ measure: z.string(), score: z.number() })
  .passthrough()
const CollocationItemOut = z
  .object({
    item: z.string(),
    raw_scores: z.array(CollocationScoreOut),
    scaled_scores: z.array(CollocationScoreOut).optional(),
    scores: z.array(CollocationScoreOut),
  })
  .passthrough()
const CollocationItemsOut = z
  .object({
    coordinates: z.array(CoordinatesOut),
    id: z.number().int(),
    items: z.array(CollocationItemOut),
    min_score: z.number().nullish().optional(),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
  })
  .passthrough()
const ValidationError = z
  .object({
    detail: z
      .object({
        '<location>': z
          .object({ '<field_name>': z.array(z.string()) })
          .partial()
          .passthrough(),
      })
      .partial()
      .passthrough(),
    message: z.string(),
  })
  .partial()
  .passthrough()
const SemanticMapOut = z
  .object({ id: z.number().int(), method: z.string(), p: z.string() })
  .passthrough()
const CorpusOut = z
  .object({
    cwb_id: z.string(),
    description: z.string().nullable(),
    id: z.number().int(),
    language: z.string().nullable(),
    name: z.string().nullable(),
    nr_tokens: z.number().int(),
    p_atts: z.array(z.string()),
    register: z.string().nullable(),
    s_annotations: z.array(z.string()),
    s_atts: z.array(z.string()),
  })
  .passthrough()
const QueryAssistedIn = z
  .object({
    corpus_id: z.number().int(),
    escape: z.boolean().optional(),
    ignore_case: z.boolean().optional(),
    ignore_diacritics: z.boolean().optional(),
    items: z.array(z.string()),
    match_strategy: z.enum(['longest', 'shortest', 'standard']).optional(),
    p: z.string(),
    s: z.string().optional(),
    subcorpus_id: z.number().int().nullish(),
  })
  .passthrough()
const DiscoursemeRangeOut = z
  .object({
    discourseme_id: z.number().int(),
    end: z.number().int(),
    start: z.number().int(),
  })
  .passthrough()
const TokenOut = z
  .object({
    cpos: z.number().int(),
    is_filter_item: z.boolean(),
    offset: z.number().int(),
    out_of_window: z.boolean(),
    primary: z.string(),
    secondary: z.string(),
  })
  .passthrough()
const ConcordanceLineOut = z
  .object({
    discourseme_ranges: z.array(DiscoursemeRangeOut),
    match_id: z.number().int(),
    structural: z.object({}).partial().passthrough(),
    tokens: z.array(TokenOut),
  })
  .passthrough()
const ConcordanceOut = z
  .object({
    lines: z.array(ConcordanceLineOut),
    nr_lines: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
  })
  .passthrough()
const CorpusAnnotationsOut = z
  .object({
    key: z.string(),
    value_type: z.enum(['datetime', 'numeric', 'boolean', 'unicode']),
  })
  .passthrough()
const CorpusLevelOut = z
  .object({ annotations: z.array(CorpusAnnotationsOut), level: z.string() })
  .passthrough()
const CorpusLevelsOut = z
  .object({ corpus_id: z.number().int(), levels: z.array(CorpusLevelOut) })
  .passthrough()
const CorpusAnnotationsIn = z
  .object({
    key: z.string(),
    level: z.string(),
    value_type: z.enum(['datetime', 'numeric', 'boolean', 'unicode']),
  })
  .passthrough()
const CorpusMetaFrequencyOut = z
  .object({
    bin_boolean: z.boolean().nullish(),
    bin_datetime: z.string().nullish(),
    bin_numeric: z.unknown().nullish(),
    bin_unicode: z.string().nullish(),
    nr_spans: z.number().int(),
    nr_tokens: z.number().int(),
  })
  .passthrough()
const CorpusMetaFrequenciesOut = z
  .object({
    frequencies: z.array(CorpusMetaFrequencyOut),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
    sort_order: z.string(),
    value_type: z.enum(['datetime', 'numeric', 'boolean', 'unicode']),
  })
  .passthrough()
const SubCorpusOut = z
  .object({
    corpus: CorpusOut,
    description: z.string().nullable(),
    id: z.number().int(),
    name: z.string().nullable(),
    nqr_cqp: z.string().nullable(),
    nr_tokens: z.number().int(),
  })
  .passthrough()
const SubCorpusCollectionOut = z
  .object({
    corpus: CorpusOut,
    description: z.string().nullable(),
    id: z.number().int(),
    name: z.string().nullable(),
    subcorpora: z.array(SubCorpusOut),
    subcorpus: SubCorpusOut.nullable(),
  })
  .passthrough()
const SubCorpusCollectionIn = z
  .object({
    create_nqr: z.boolean().optional().default(true),
    description: z.string().nullish(),
    key: z.string(),
    level: z.string(),
    name: z.string(),
    subcorpus_id: z.number().int().nullish().default(null),
    time_interval: z
      .enum(['hour', 'day', 'week', 'month', 'year'])
      .optional()
      .default('day'),
  })
  .passthrough()
const SubCorpusIn = z
  .object({
    bins_boolean: z.array(z.boolean()).nullish(),
    bins_datetime: z.array(z.unknown()).nullish(),
    bins_numeric: z.array(z.unknown()).nullish(),
    bins_unicode: z.array(z.string()).nullish(),
    create_nqr: z.boolean().optional().default(true),
    description: z.string().nullish(),
    key: z.string(),
    level: z.string(),
    name: z.string(),
    subcorpus_id: z.number().int().nullish().default(null),
  })
  .passthrough()
const KeywordOut = z
  .object({
    corpus_id: z.number().int(),
    corpus_id_reference: z.number().int(),
    corpus_name: z.string(),
    corpus_name_reference: z.string(),
    id: z.number().int(),
    min_freq: z.number().int(),
    nr_items: z.number().int(),
    p: z.string(),
    p_reference: z.string(),
    semantic_map_id: z.number().int().nullable(),
    sub_vs_rest: z.boolean(),
    subcorpus_id: z.number().int().nullable(),
    subcorpus_id_reference: z.number().int().nullable(),
    subcorpus_name: z.string().nullable(),
    subcorpus_name_reference: z.string().nullable(),
  })
  .passthrough()
const KeywordIn = z
  .object({
    corpus_id: z.number().int(),
    corpus_id_reference: z.number().int(),
    min_freq: z.number().int().optional().default(3),
    p: z.string().optional().default('lemma'),
    p_reference: z.string().optional().default('lemma'),
    semantic_map_id: z.number().int().nullish().default(null),
    semantic_map_init: z.boolean().optional().default(true),
    sub_vs_rest: z.boolean().optional().default(true),
    subcorpus_id: z.number().int().nullish().default(null),
    subcorpus_id_reference: z.number().int().nullish().default(null),
  })
  .passthrough()
const KeywordScoreOut = z
  .object({ measure: z.string(), score: z.number() })
  .passthrough()
const KeywordItemOut = z
  .object({
    item: z.string(),
    raw_scores: z.array(KeywordScoreOut),
    scaled_scores: z.array(KeywordScoreOut),
    scores: z.array(KeywordScoreOut),
  })
  .passthrough()
const KeywordItemsOut = z
  .object({
    coordinates: z.array(CoordinatesOut),
    id: z.number().int(),
    items: z.array(KeywordItemOut),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
  })
  .passthrough()
const DiscoursemeItem = z
  .object({
    cqp_query: z.string().nullable(),
    p: z.string().nullable(),
    surface: z.string().nullable(),
  })
  .partial()
  .passthrough()
const DiscoursemeOut = z
  .object({
    comment: z.string().nullable(),
    id: z.number().int(),
    name: z.string().nullable(),
    template: z.array(DiscoursemeItem),
  })
  .passthrough()
const ConstellationOut = z
  .object({
    comment: z.string().nullable(),
    discoursemes: z.array(DiscoursemeOut),
    id: z.number().int(),
    name: z.string().nullable(),
  })
  .passthrough()
const ConstellationIn = z
  .object({
    comment: z.string().nullable(),
    discourseme_ids: z.array(z.number().int()).default([]),
    name: z.string().nullable(),
  })
  .partial()
  .passthrough()
const ConstellationInUpdate = z
  .object({
    comment: z.string().nullable(),
    discourseme_ids: z.array(z.number().int()).default([]),
    name: z.string().nullable(),
  })
  .partial()
  .passthrough()
const DiscoursemeDescriptionOut = z
  .object({
    corpus_id: z.number().int(),
    discourseme_id: z.number().int(),
    id: z.number().int(),
    items: z.array(DiscoursemeItem),
    match_strategy: z.string(),
    query_id: z.number().int(),
    s: z.string(),
    subcorpus_id: z.number().int().nullable(),
  })
  .passthrough()
const ConstellationDescriptionOut = z
  .object({
    corpus_id: z.number().int(),
    discourseme_descriptions: z.array(DiscoursemeDescriptionOut),
    id: z.number().int(),
    match_strategy: z.string(),
    s: z.string(),
    subcorpus_id: z.number().int().nullable(),
  })
  .passthrough()
const ConstellationDescriptionIn = z
  .object({
    corpus_id: z.number().int(),
    match_strategy: z
      .enum(['longest', 'shortest', 'standard'])
      .optional()
      .default('longest'),
    overlap: z
      .enum(['partial', 'full', 'match', 'matchend'])
      .optional()
      .default('partial'),
    s: z.string().optional(),
    subcorpus_id: z.number().int().optional(),
  })
  .passthrough()
const ConstellationDescriptionCollectionOut = z
  .object({
    constellation_descriptions: z.array(ConstellationDescriptionOut),
    id: z.number().int(),
    match_strategy: z
      .enum(['longest', 'shortest', 'standard'])
      .optional()
      .default('longest'),
    overlap: z
      .enum(['partial', 'full', 'match', 'matchend'])
      .optional()
      .default('partial'),
    s: z.string().nullable(),
    subcorpus_collection_id: z.number().int(),
  })
  .passthrough()
const ConstellationDescriptionCollectionIn = z
  .object({
    match_strategy: z
      .enum(['longest', 'shortest', 'standard'])
      .optional()
      .default('longest'),
    overlap: z
      .enum(['partial', 'full', 'match', 'matchend'])
      .optional()
      .default('partial'),
    s: z.string().optional(),
    subcorpus_collection_id: z.number().int(),
  })
  .passthrough()
const DiscoursemeIDs = z
  .object({ discourseme_ids: z.array(z.number().int()) })
  .passthrough()
const DiscoursemeIn = z
  .object({
    comment: z.string().nullable(),
    name: z.string().nullable(),
    template: z.array(DiscoursemeItem).nullable().default([]),
  })
  .partial()
  .passthrough()
const ConstellationCollocationIn = z
  .object({
    filter_discourseme_ids: z.array(z.number().int()).optional().default([]),
    filter_item: z.string().nullish(),
    filter_item_p_att: z.string().optional().default('lemma'),
    filter_overlap: z
      .enum(['partial', 'full', 'match', 'matchend'])
      .optional()
      .default('partial'),
    focus_discourseme_id: z.number().int(),
    include_negative: z.boolean().optional().default(false),
    marginals: z.enum(['local', 'global']).optional().default('local'),
    p: z.string(),
    s_break: z.string().optional(),
    semantic_map_id: z.number().int().nullish().default(null),
    semantic_map_init: z.boolean().optional().default(true),
    window: z.number().int().optional().default(10),
  })
  .passthrough()
const ConstellationCollocationOut = z
  .object({
    filter_discourseme_ids: z.array(z.number().int()),
    focus_discourseme_id: z.number().int(),
    id: z.number().int(),
    marginals: z.string(),
    nr_items: z.number().int(),
    p: z.string(),
    query_id: z.number().int(),
    s_break: z.string(),
    semantic_map_id: z.number().int().nullable(),
    window: z.number().int(),
  })
  .passthrough()
const UFAConfidenceIntervalOut = z
  .object({
    lower_90: z.number().nullable(),
    lower_95: z.number().nullable(),
    smooth: z.number().nullable(),
    upper_90: z.number().nullable(),
    upper_95: z.number().nullable(),
  })
  .passthrough()
const UFAScoreOut = z
  .object({
    collocation_id_left: z.number().int().nullable(),
    collocation_id_right: z.number().int().nullable(),
    description_id_left: z.number().int(),
    description_id_right: z.number().int(),
    score: z.number().nullable(),
    score_confidence: UFAConfidenceIntervalOut,
    x_label: z.string(),
  })
  .passthrough()
const UFAOut = z
  .object({
    collocations: z.array(ConstellationCollocationOut),
    ufa: z.array(UFAScoreOut),
  })
  .passthrough()
const DiscoursemeDescriptionIDs = z
  .object({ discourseme_description_ids: z.array(z.number().int()) })
  .passthrough()
const ConstellationDescriptionOutUpdate = z
  .object({
    corpus_id: z.number().int(),
    discourseme_descriptions: z.array(DiscoursemeDescriptionOut),
    id: z.number().int(),
    match_strategy: z.string(),
    s: z.string(),
    subcorpus_id: z.number().int().nullable(),
  })
  .partial()
  .passthrough()
const ConstellationAssociationItemOut = z
  .object({
    candidate: z.number().int(),
    measure: z.string(),
    node: z.number().int(),
    score: z.number().nullable(),
  })
  .passthrough()
const ConstellationAssociationOut = z
  .object({
    N: z.number().int(),
    nr_pairs: z.number().int(),
    s: z.string(),
    scaled_scores: z.array(ConstellationAssociationItemOut),
    scores: z.array(ConstellationAssociationItemOut),
  })
  .passthrough()
const ConstellationBreakdownItemOut = z
  .object({
    breakdown_id: z.number().int(),
    discourseme_id: z.number().int(),
    freq: z.number().int(),
    id: z.number().int().nullable(),
    ipm: z.number(),
    item: z.string(),
    nr_tokens: z.number().int(),
    source: z.enum(['discoursemes', 'discourseme_items']),
  })
  .passthrough()
const ConstellationBreakdownOut = z
  .object({
    constellation_description_id: z.number().int(),
    items: z.array(ConstellationBreakdownItemOut),
    p: z.string(),
  })
  .passthrough()
const DiscoursemeCoordinatesOut = z
  .object({
    discourseme_id: z.number().int(),
    semantic_map_id: z.number().int(),
    x: z.number(),
    x_user: z.number().nullable(),
    y: z.number(),
    y_user: z.number().nullable(),
  })
  .passthrough()
const DiscoursemeScoresOut = z
  .object({
    discourseme_id: z.number().int(),
    global_scores: z.array(CollocationScoreOut).nullable(),
    item_scores: z.array(CollocationItemOut).nullable(),
    unigram_item_scores: z.array(CollocationItemOut).nullable(),
  })
  .passthrough()
const ConstellationCollocationItemsOut = z
  .object({
    coordinates: z.array(CoordinatesOut),
    discourseme_coordinates: z.array(DiscoursemeCoordinatesOut),
    discourseme_scores: z.array(DiscoursemeScoresOut),
    id: z.number().int(),
    items: z.array(CollocationItemOut),
    min_score: z.number().nullish().optional(),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
  })
  .passthrough()
const ConstellationMapItemOut = z
  .object({
    discourseme_id: z.number().int().nullable(),
    item: z.string(),
    scaled_score: z.number(),
    score: z.number(),
    source: z.string(),
    x: z.number(),
    y: z.number(),
  })
  .passthrough()
const ScoreDeciles = z
  .object({
    decile: z.number().int(),
    scaled_score: z.number(),
    score: z.number(),
  })
  .passthrough()
const ConstellationMapOut = z
  .object({
    id: z.number().int(),
    map: z.array(ConstellationMapItemOut).optional(),
    min_score: z.number().optional(),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    score_deciles: z.array(ScoreDeciles).optional(),
    semantic_map_id: z.number().int(),
    sort_by: z.string(),
  })
  .passthrough()
const ConstellationKeywordIn = z
  .object({
    corpus_id_reference: z.number().int(),
    min_freq: z.number().int().optional().default(3),
    p: z.string().optional().default('lemma'),
    p_reference: z.string().optional().default('lemma'),
    semantic_map_id: z.number().int().nullish().default(null),
    sub_vs_rest: z.boolean().optional().default(true),
    subcorpus_id_reference: z.number().int().nullish().default(null),
  })
  .passthrough()
const ConstellationKeywordItemsOut = z
  .object({
    coordinates: z.array(CoordinatesOut),
    discourseme_coordinates: z.array(DiscoursemeCoordinatesOut),
    discourseme_scores: z.array(DiscoursemeScoresOut),
    id: z.number().int(),
    items: z.array(KeywordItemOut),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
  })
  .passthrough()
const Generated = z
  .object({ discourseme_description_ids: z.array(z.number().int()) })
  .passthrough()
const DiscoursemeCoordinatesIn = z
  .object({
    discourseme_id: z.number().int(),
    x_user: z.number().nullable(),
    y_user: z.number().nullable(),
  })
  .passthrough()
const DiscoursemeInUpdate = z
  .object({
    comment: z.string().nullable(),
    name: z.string().nullable(),
    template: z.array(DiscoursemeItem).nullable().default([]),
  })
  .partial()
  .passthrough()
const DiscoursemeDescriptionIn = z
  .object({
    corpus_id: z.number().int(),
    items: z.array(DiscoursemeItem).nullish().default([]),
    match_strategy: z
      .enum(['longest', 'shortest', 'standard'])
      .optional()
      .default('longest'),
    s: z.string().optional(),
    subcorpus_id: z.number().int().nullish(),
  })
  .passthrough()
const DiscoursemeItemsIn = z
  .object({ items: z.array(z.string()), p: z.string().nullish() })
  .passthrough()
const BreakdownItemsOut = z
  .object({
    breakdown_id: z.number().int(),
    freq: z.number().int(),
    id: z.number().int(),
    ipm: z.number(),
    item: z.string(),
    nr_tokens: z.number().int(),
  })
  .passthrough()
const BreakdownOut = z
  .object({
    id: z.number().int(),
    items: z.array(BreakdownItemsOut),
    p: z.string(),
    query_id: z.number().int(),
  })
  .passthrough()
const DiscoursemeDescriptionSimilarOut = z
  .object({
    freq: z.number().int(),
    p: z.string(),
    similarity: z.number(),
    surface: z.string(),
  })
  .passthrough()
const QueryMetaFrequencyOut = z
  .object({
    bin_boolean: z.boolean().nullish(),
    bin_datetime: z.string().nullish(),
    bin_numeric: z.unknown().nullish(),
    bin_unicode: z.string().nullish(),
    item: z.string().optional(),
    nr_ipm: z.number().optional(),
    nr_matches: z.number().int().optional(),
    nr_spans: z.number().int(),
    nr_tokens: z.number().int(),
  })
  .passthrough()
const QueryMetaFrequenciesOut = z
  .object({
    frequencies: z.array(QueryMetaFrequencyOut),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
    sort_order: z.string(),
    value_type: z.enum(['datetime', 'numeric', 'boolean', 'unicode']),
  })
  .passthrough()
const QueryOut = z
  .object({
    corpus_id: z.number().int(),
    corpus_name: z.string(),
    cqp_query: z.string(),
    id: z.number().int(),
    match_strategy: z.string(),
    number_matches: z.number().int(),
    random_seed: z.number().int(),
    subcorpus_id: z.number().int().nullable(),
    subcorpus_name: z.string().nullable(),
  })
  .passthrough()
const QueryIn = z
  .object({
    corpus_id: z.number().int(),
    cqp_query: z.string(),
    match_strategy: z.enum(['longest', 'shortest', 'standard']).optional(),
    s: z.string().optional(),
    subcorpus_id: z.number().int().nullish(),
  })
  .passthrough()
const CollocationIn = z
  .object({
    filter_item: z.string().nullish(),
    filter_item_p_att: z.string().optional().default('lemma'),
    filter_overlap: z
      .enum(['partial', 'full', 'match', 'matchend'])
      .optional()
      .default('partial'),
    marginals: z.enum(['local', 'global']).optional().default('local'),
    p: z.string(),
    s_break: z.string().optional(),
    semantic_map_id: z.number().int().nullish().default(null),
    semantic_map_init: z.boolean().optional().default(true),
    window: z.number().int().optional().default(10),
  })
  .passthrough()
const SemanticMapIn = z
  .object({
    collocation_ids: z.array(z.number().int()).default([]),
    keyword_ids: z.array(z.number().int()).default([]),
    method: z.enum(['tsne', 'umap']).default('tsne'),
  })
  .partial()
  .passthrough()
const CoordinatesIn = z
  .object({
    item: z.string(),
    x_user: z.number().nullish().default(null),
    y_user: z.number().nullish().default(null),
  })
  .passthrough()
const AnchorCorrection = z
  .object({ anchor: z.string(), correction: z.number().int() })
  .partial()
  .passthrough()
const AnchorSlot = z
  .object({ end: z.string(), slot: z.string(), start: z.string() })
  .partial()
  .passthrough()
const SlotQueryOut = z
  .object({
    corpus_id: z.number().int(),
    corrections: z.array(AnchorCorrection),
    cqp_query: z.string(),
    id: z.number().int(),
    match_strategy: z.enum(['longest', 'shortest', 'standard']),
    name: z.string(),
    slots: z.array(AnchorSlot),
  })
  .partial()
  .passthrough()
const SlotQueryIn = z
  .object({
    corpus_id: z.number().int(),
    corrections: z.array(AnchorCorrection).optional(),
    cqp_query: z.string().optional(),
    match_strategy: z.enum(['longest', 'shortest', 'standard']).optional(),
    name: z.string().optional(),
    slots: z.array(AnchorSlot).optional(),
  })
  .passthrough()
const UFAComparisonOut = z
  .object({
    collocation_id_left: z.number().int().optional(),
    collocation_id_right: z.number().int().optional(),
    keyword_id_left: z.number().int().optional(),
    keyword_id_right: z.number().int().optional(),
    max_depth: z.number().int(),
    measure: z.string(),
    p: z.number(),
    score: z.number(),
    sort_by: z.string(),
  })
  .passthrough()
const UserOut = z
  .object({ id: z.number().int(), username: z.string() })
  .passthrough()
const UserRegister = z
  .object({
    confirm_password: z.string(),
    email: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    password: z.string(),
    username: z.string(),
  })
  .passthrough()
const UserIn = z
  .object({ password: z.string(), username: z.string() })
  .passthrough()
const HTTPTokenOut = z
  .object({ access_token: z.string(), refresh_token: z.string() })
  .passthrough()
const HTTPRefreshTokenIn = z.object({ refresh_token: z.string() }).passthrough()
const UserUpdate = z
  .object({
    confirm_password: z.string(),
    new_password: z.string(),
    old_password: z.string(),
  })
  .passthrough()

export const schemas = {
  CollocationOut,
  HTTPError,
  CoordinatesOut,
  CollocationScoreOut,
  CollocationItemOut,
  CollocationItemsOut,
  ValidationError,
  SemanticMapOut,
  CorpusOut,
  QueryAssistedIn,
  DiscoursemeRangeOut,
  TokenOut,
  ConcordanceLineOut,
  ConcordanceOut,
  CorpusAnnotationsOut,
  CorpusLevelOut,
  CorpusLevelsOut,
  CorpusAnnotationsIn,
  CorpusMetaFrequencyOut,
  CorpusMetaFrequenciesOut,
  SubCorpusOut,
  SubCorpusCollectionOut,
  SubCorpusCollectionIn,
  SubCorpusIn,
  KeywordOut,
  KeywordIn,
  KeywordScoreOut,
  KeywordItemOut,
  KeywordItemsOut,
  DiscoursemeItem,
  DiscoursemeOut,
  ConstellationOut,
  ConstellationIn,
  ConstellationInUpdate,
  DiscoursemeDescriptionOut,
  ConstellationDescriptionOut,
  ConstellationDescriptionIn,
  ConstellationDescriptionCollectionOut,
  ConstellationDescriptionCollectionIn,
  DiscoursemeIDs,
  DiscoursemeIn,
  ConstellationCollocationIn,
  ConstellationCollocationOut,
  UFAConfidenceIntervalOut,
  UFAScoreOut,
  UFAOut,
  DiscoursemeDescriptionIDs,
  ConstellationDescriptionOutUpdate,
  ConstellationAssociationItemOut,
  ConstellationAssociationOut,
  ConstellationBreakdownItemOut,
  ConstellationBreakdownOut,
  DiscoursemeCoordinatesOut,
  DiscoursemeScoresOut,
  ConstellationCollocationItemsOut,
  ConstellationMapItemOut,
  ScoreDeciles,
  ConstellationMapOut,
  ConstellationKeywordIn,
  ConstellationKeywordItemsOut,
  Generated,
  DiscoursemeCoordinatesIn,
  DiscoursemeInUpdate,
  DiscoursemeDescriptionIn,
  DiscoursemeItemsIn,
  BreakdownItemsOut,
  BreakdownOut,
  DiscoursemeDescriptionSimilarOut,
  QueryMetaFrequencyOut,
  QueryMetaFrequenciesOut,
  QueryOut,
  QueryIn,
  CollocationIn,
  SemanticMapIn,
  CoordinatesIn,
  AnchorCorrection,
  AnchorSlot,
  SlotQueryOut,
  SlotQueryIn,
  UFAComparisonOut,
  UserOut,
  UserRegister,
  UserIn,
  HTTPTokenOut,
  HTTPRefreshTokenIn,
  UserUpdate,
}

const endpoints = makeApi([
  {
    method: 'get',
    path: '/',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/collocation/',
    requestFormat: 'json',
    response: z.array(CollocationOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/collocation/:id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/collocation/:id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: CollocationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/collocation/:id/items',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'min_score',
        type: 'Query',
        schema: z.number().nullish().default(null),
      },
    ],
    response: CollocationItemsOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/collocation/:id/semantic-map/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'semantic_map_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'method',
        type: 'Query',
        schema: z.enum(['tsne', 'umap']).optional().default('tsne'),
      },
    ],
    response: SemanticMapOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/',
    requestFormat: 'json',
    response: z.array(CorpusOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: CorpusOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/concordance',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: QueryAssistedIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(25),
      },
      {
        name: 'extended_context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'primary',
        type: 'Query',
        schema: z.string().optional().default('word'),
      },
      {
        name: 'secondary',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'highlight_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['random', 'first', 'last', 'ascending', 'descending'])
          .optional()
          .default('random'),
      },
      {
        name: 'sort_by_offset',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'sort_by_p_att',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'sort_by_s_att',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
    ],
    response: ConcordanceOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/meta/',
    description: `TODO also return some descriptive summary of level annotations?`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: CorpusLevelsOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/corpus/:id/meta/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CorpusAnnotationsIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: CorpusAnnotationsOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/meta/frequencies',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'level',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'key',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum(['bin', 'nr_spans', 'nr_tokens'])
          .optional()
          .default('nr_tokens'),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'nr_bins',
        type: 'Query',
        schema: z.number().int().optional().default(30),
      },
      {
        name: 'time_interval',
        type: 'Query',
        schema: z
          .enum(['hour', 'day', 'week', 'month', 'year'])
          .optional()
          .default('day'),
      },
    ],
    response: CorpusMetaFrequenciesOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/subcorpus-collection/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
    ],
    response: z.array(SubCorpusCollectionOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/corpus/:id/subcorpus-collection/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SubCorpusCollectionIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: SubCorpusCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/corpus/:id/subcorpus-collection/:subcorpus_collection_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/subcorpus-collection/:subcorpus_collection_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: SubCorpusCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/subcorpus/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(SubCorpusOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/corpus/:id/subcorpus/',
    description: `We only support creation of subcorpora from one level-key pair.
- boolean / unicode keys: categorical select
- numeric / datetime keys: interval select

Subcorpora can be built iteratively as long as working on the same level.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SubCorpusIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: SubCorpusOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/corpus/:id/subcorpus/:subcorpus_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/corpus/:id/subcorpus/:subcorpus_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: SubCorpusOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/hello',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/keyword/',
    requestFormat: 'json',
    response: z.array(KeywordOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/keyword/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: KeywordIn,
      },
    ],
    response: KeywordOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/keyword/:id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/keyword/:id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: KeywordOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/keyword/:id/items',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
    ],
    response: KeywordItemsOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/keyword/:id/semantic-map/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'semantic_map_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'method',
        type: 'Query',
        schema: z.enum(['tsne', 'umap']).optional().default('tsne'),
      },
    ],
    response: KeywordOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/',
    requestFormat: 'json',
    response: z.array(ConstellationOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationIn,
      },
    ],
    response: ConstellationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/constellation/:constellation_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationInUpdate,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/add-discourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationInUpdate,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(ConstellationDescriptionOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/:constellation_id/description/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationDescriptionIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/constellation/:constellation_id/description/:description_id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/description/:description_id/add-descriptions',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeDescriptionIDs,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionOutUpdate,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/description/:description_id/add-discoursemes',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIDs,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionOutUpdate,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/associations/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationAssociationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/breakdown/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: ConstellationBreakdownOut,
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/collocation/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(ConstellationCollocationOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/:constellation_id/description/:description_id/collocation/',
    description: `Create collocation analysis of constellation description.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationCollocationIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationCollocationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/:description_id/collocation/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationCollocationIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationCollocationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/:description_id/collocation/:collocation_id/auto-associate',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationCollocationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/collocation/:collocation_id/items',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'return_coordinates',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'hide_focus',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
      {
        name: 'hide_filter',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'min_score',
        type: 'Query',
        schema: z.number().nullish().default(null),
      },
    ],
    response: ConstellationCollocationItemsOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/collocation/:collocation_id/map',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'min_score',
        type: 'Query',
        schema: z.number().nullish().default(null),
      },
    ],
    response: ConstellationMapOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/concordance/',
    description: `TODO re-write using ..query.get_concordance_lines`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'filter_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
      {
        name: 'focus_discourseme_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(25),
      },
      {
        name: 'extended_context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'primary',
        type: 'Query',
        schema: z.string().optional().default('word'),
      },
      {
        name: 'secondary',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'highlight_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['random', 'first', 'last', 'ascending', 'descending'])
          .optional()
          .default('random'),
      },
      {
        name: 'sort_by_offset',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'sort_by_p_att',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'sort_by_s_att',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
    ],
    response: ConcordanceOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/concordance/:match_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'match_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'focus_discourseme_id',
        type: 'Query',
        schema: z.number().int(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(25),
      },
      {
        name: 'extended_context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'primary',
        type: 'Query',
        schema: z.string().optional().default('word'),
      },
      {
        name: 'secondary',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'highlight_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
    ],
    response: ConcordanceLineOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/:constellation_id/description/:description_id/discourseme-description',
    description: `(1) create a discourseme with provided items
(2) create a suitable description in the constellation description corpus
(3) link discourseme to constellation
(4) link discourseme description and constellation description`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/:description_id/discourseme-description',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/keyword/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(KeywordOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/:constellation_id/description/:description_id/keyword/',
    description: `Create keyword analysis for constellation description.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationKeywordIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: KeywordOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/:description_id/keyword/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationKeywordIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: KeywordOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/:description_id/keyword/:keyword_id/auto-associate',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/keyword/:keyword_id/items',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'return_coordinates',
        type: 'Query',
        schema: z.boolean().optional().default(false),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
    ],
    response: ConstellationKeywordItemsOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/keyword/:keyword_id/map',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
    ],
    response: ConstellationMapOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/description/:description_id/remove-descriptions',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: Generated,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionOutUpdate,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/description/:description_id/remove-discoursemes',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIDs,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionOutUpdate,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/:description_id/semantic-map/:semantic_map_id/coordinates/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'semantic_map_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(DiscoursemeCoordinatesOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/:description_id/semantic-map/:semantic_map_id/coordinates/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeCoordinatesIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'semantic_map_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(DiscoursemeCoordinatesOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/collection/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(ConstellationDescriptionCollectionOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/:constellation_id/description/collection/',
    description: `Create constellation description collection.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationDescriptionCollectionIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/collection/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationDescriptionCollectionIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/constellation/:constellation_id/description/collection/:collection_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/constellation/:constellation_id/description/collection/:collection_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/description/collection/:collection_id/add-discoursemes',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIDs,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/constellation/:constellation_id/description/collection/:collection_id/discourseme-description',
    description: `(1) create a discourseme with provided items
(2) create a suitable description in the constellation description corpus
(3) link discourseme to constellation
(4) link discourseme description and constellation description`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/description/collection/:collection_id/remove-discoursemes',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIDs,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collection_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationDescriptionCollectionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/collection/:collection_id/ufa',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationCollocationIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collection_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'max_depth',
        type: 'Query',
        schema: z.number().int().optional(),
      },
    ],
    response: UFAOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/constellation/:constellation_id/description/collection/:description_id/discourseme-description',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIn,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/constellation/:constellation_id/remove-discourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationInUpdate,
      },
      {
        name: 'constellation_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: ConstellationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/',
    requestFormat: 'json',
    response: z.array(DiscoursemeOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/discourseme/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeIn,
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/discourseme/:discourseme_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/:discourseme_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/discourseme/:discourseme_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeInUpdate,
      },
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/:discourseme_id/description/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(DiscoursemeDescriptionOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/discourseme/:discourseme_id/description/',
    description: `Will automatically create query (from provided items or template).`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeDescriptionIn,
      },
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'update_discourseme',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: DiscoursemeDescriptionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: DiscoursemeDescriptionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/add-items',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeItemsIn,
      },
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'update_discourseme',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: DiscoursemeDescriptionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/breakdown',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: BreakdownOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/breakdown/:breakdown_id/similar',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'breakdown_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'number',
        type: 'Query',
        schema: z.number().int().optional().default(200),
      },
      {
        name: 'embeddings',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
    ],
    response: z.array(DiscoursemeDescriptionSimilarOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/meta',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'level',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'key',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum(['bin', 'nr_ipm', 'nr_matches', 'nr_tokens', 'nr_spans'])
          .optional()
          .default('nr_ipm'),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'nr_bins',
        type: 'Query',
        schema: z.number().int().optional().default(30),
      },
      {
        name: 'time_interval',
        type: 'Query',
        schema: z
          .enum(['hour', 'day', 'week', 'month', 'year'])
          .optional()
          .default('day'),
      },
    ],
    response: QueryMetaFrequenciesOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/mmda/discourseme/:discourseme_id/description/:description_id/remove-items',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeItemsIn,
      },
      {
        name: 'discourseme_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'description_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'update_discourseme',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: DiscoursemeDescriptionOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/query/',
    requestFormat: 'json',
    response: z.array(QueryOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/query/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: QueryIn,
      },
      {
        name: 'execute',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: QueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/query/:query_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/query/:query_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: QueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/query/:query_id/breakdown',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string(),
      },
    ],
    response: BreakdownOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/query/:query_id/collocation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CollocationIn,
      },
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: CollocationOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/query/:query_id/concordance',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(25),
      },
      {
        name: 'extended_context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'primary',
        type: 'Query',
        schema: z.string().optional().default('word'),
      },
      {
        name: 'secondary',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'highlight_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['random', 'first', 'last', 'ascending', 'descending'])
          .optional()
          .default('random'),
      },
      {
        name: 'sort_by_offset',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'sort_by_p_att',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'sort_by_s_att',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
    ],
    response: ConcordanceOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/query/:query_id/concordance/:match_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'match_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(25),
      },
      {
        name: 'extended_context_break',
        type: 'Query',
        schema: z.string().nullish().default(null),
      },
      {
        name: 'primary',
        type: 'Query',
        schema: z.string().optional().default('word'),
      },
      {
        name: 'secondary',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'highlight_query_ids',
        type: 'Query',
        schema: z.array(z.number().int()).optional().default([]),
      },
    ],
    response: ConcordanceLineOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/query/:query_id/concordance/shuffle',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: QueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/query/:query_id/meta',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Query',
        schema: z.number().int().nullish().default(null),
      },
      {
        name: 'level',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'key',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum(['bin', 'nr_ipm', 'nr_matches', 'nr_tokens', 'nr_spans'])
          .optional()
          .default('nr_ipm'),
      },
      {
        name: 'sort_order',
        type: 'Query',
        schema: z
          .enum(['ascending', 'descending'])
          .optional()
          .default('descending'),
      },
      {
        name: 'page_size',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'page_number',
        type: 'Query',
        schema: z.number().int().optional().default(1),
      },
      {
        name: 'nr_bins',
        type: 'Query',
        schema: z.number().int().optional().default(30),
      },
      {
        name: 'time_interval',
        type: 'Query',
        schema: z
          .enum(['hour', 'day', 'week', 'month', 'year'])
          .optional()
          .default('day'),
      },
    ],
    response: QueryMetaFrequenciesOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/query/assisted/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: QueryAssistedIn,
      },
      {
        name: 'execute',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: QueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/query/assisted/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: QueryAssistedIn,
      },
      {
        name: 'execute',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
    ],
    response: QueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/semantic-map/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SemanticMapIn,
      },
    ],
    response: SemanticMapOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/semantic-map/:id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/semantic-map/:id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: SemanticMapOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/semantic-map/:id/coordinates/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(CoordinatesOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/semantic-map/:id/coordinates/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CoordinatesIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(CoordinatesOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/spheroscope/slot-query/',
    requestFormat: 'json',
    response: z.array(SlotQueryOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/spheroscope/slot-query/:id/execute',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: SlotQueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/spheroscope/slot-query/create',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: SlotQueryIn,
      },
    ],
    response: SlotQueryOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/ufa/score',
    requestFormat: 'json',
    parameters: [
      {
        name: 'collocation_id_left',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'collocation_id_right',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'keyword_id_left',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'keyword_id_right',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'max_depth',
        type: 'Query',
        schema: z.number().int().optional().default(50),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.number().optional().default(0.95),
      },
      {
        name: 'sort_by',
        type: 'Query',
        schema: z
          .enum([
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
            'conservative_log_ratio',
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
          ])
          .optional()
          .default('conservative_log_ratio'),
      },
      {
        name: 'measure',
        type: 'Query',
        schema: z
          .enum(['rbo', 'gwets_ac1', 'cohens_kappa'])
          .optional()
          .default('rbo'),
      },
    ],
    response: UFAComparisonOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/user/',
    requestFormat: 'json',
    response: z.array(UserOut),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/user/',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: UserRegister,
      },
    ],
    response: UserOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/user/:id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/user/:id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: UserOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/user/:id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: UserUpdate,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: UserOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/user/identify',
    requestFormat: 'json',
    response: UserOut,
    errors: [
      {
        status: 401,
        description: `Authentication error`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/user/login',
    requestFormat: 'form-url',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: UserIn,
      },
    ],
    response: HTTPTokenOut,
    errors: [
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/user/refresh',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ refresh_token: z.string() }).passthrough(),
      },
    ],
    response: HTTPTokenOut,
    errors: [
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
])

export const api = new Zodios(endpoints)

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options)
}
