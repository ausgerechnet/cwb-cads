import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

type BreakdownOut = Partial<{
  id: number
  items: Array<BreakdownItemsOut>
  p: string
  query_id: number
}>
type BreakdownItemsOut = Partial<{
  breakdown_id: number
  freq: number
  id: number
  ipm: number
  item: string
  nr_tokens: number
}>
type CollocationItemOut = Partial<{
  item: string
  scores: Array<CollocationScoreOut>
}>
type CollocationScoreOut = Partial<{
  measure: string
  score: number
}>
type CollocationItemsOut = Partial<{
  coordinates: Array<CoordinatesOut> | null
  discourseme_scores: Array<DiscoursemeScoresOut> | null
  id: number
  items: Array<CollocationItemOut>
  nr_items: number
  page_count: number
  page_number: number
  page_size: number
  sort_by: string
}>
type CoordinatesOut = Partial<{
  item: string
  semantic_map_id: number
  x: number
  x_user: number
  y: number
  y_user: number
}>
type DiscoursemeScoresOut = Partial<{
  discourseme_id: number
  global_scores: Array<CollocationScoreOut>
  item_scores: Array<CollocationItemOut>
  unigram_item_scores: Array<CollocationItemOut>
}>
type ConcordanceLineOut = Partial<{
  discourseme_ranges: Array<DiscoursemeRangeOut>
  id: number
  structural: {}
  tokens: Array<TokenOut>
}>
type DiscoursemeRangeOut = Partial<{
  discourseme_id: number
  end: number
  start: number
}>
type TokenOut = Partial<{
  cpos: number
  is_filter_item: boolean
  offset: number
  out_of_window: boolean
  primary: string
  secondary: string
}>
type ConcordanceOut = Partial<{
  lines: Array<ConcordanceLineOut>
  nr_lines: number
  page_count: number
  page_number: number
  page_size: number
}>
type ConstellationOut = Partial<{
  description: string | null
  filter_discoursemes: Array<DiscoursemeOut>
  highlight_discoursemes: Array<DiscoursemeOut>
  id: number
  name: string | null
}>
type DiscoursemeOut = Partial<{
  comment: string | null
  id: number
  name: string | null
  template: Array<DiscoursemeTemplateItem>
}>
type DiscoursemeTemplateItem = Partial<{
  cqp_query: string | null
  p: string | null
  surface: string | null
}>
type DiscoursemeDescriptionOut = Partial<{
  corpus_id: number
  discourseme_id: number
  id: number
  items: Array<DiscoursemeDescriptionItem>
  match_strategy: string
  p: string
  query_id: number
  s: string
  semantic_map_id: number
  subcorpus_id: number
}>
type DiscoursemeDescriptionItem = Partial<{
  item: string
}>
type DiscoursemeIn = Partial<{
  comment: string
  name: string
  template: Array<DiscoursemeTemplateItem>
}>
type DiscoursemeInUpdate = Partial<{
  comment: string
  name: string
  template: Array<DiscoursemeTemplateItem>
}>
type KeywordItemOut = Partial<{
  item: string
  scores: Array<KeywordScoreOut>
}>
type KeywordScoreOut = Partial<{
  measure: string
  score: number
}>
type KeywordItemsOut = Partial<{
  coordinates: Array<CoordinatesOut> | null
  discourseme_scores: Array<DiscoursemeScoresOut> | null
  id: number
  items: Array<KeywordItemOut>
  nr_items: number
  page_count: number
  page_number: number
  page_size: number
  sort_by: string
}>
type MetaOut = Partial<{
  annotations: Array<AnnotationsOut>
  level: string
}>
type AnnotationsOut = Partial<{
  key: string
  value_type: 'datetime' | 'numeric' | 'boolean' | 'unicode'
}>
type SubCorpusOut = Partial<{
  corpus: CorpusOut
  description: string | null
  id: number
  name: string | null
  nqr_cqp: string | null
}>
type CorpusOut = Partial<{
  cwb_id: string
  description: string | null
  id: number
  language: string | null
  name: string | null
  p_atts: Array<string>
  register: string | null
  s_annotations: Array<string>
  s_atts: Array<string>
}>

const CollocationOut = z
  .object({
    constellation_id: z.number().int().nullable(),
    id: z.number().int(),
    marginals: z.enum(['local', 'global']),
    nr_items: z.number().int(),
    p: z.string(),
    s_break: z.string(),
    semantic_map_id: z.number().int().nullable(),
  })
  .partial()
  .passthrough()
const HTTPError = z
  .object({ detail: z.object({}).partial().passthrough(), message: z.string() })
  .partial()
  .passthrough()
const CollocationPatchIn = z
  .object({
    constellation_id: z.number().int().nullable(),
    semantic_map_id: z.number().int().nullable(),
  })
  .partial()
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
const CoordinatesOut: z.ZodType<CoordinatesOut> = z
  .object({
    item: z.string(),
    semantic_map_id: z.number().int(),
    x: z.number(),
    x_user: z.number(),
    y: z.number(),
    y_user: z.number(),
  })
  .partial()
  .passthrough()
const CollocationScoreOut: z.ZodType<CollocationScoreOut> = z
  .object({ measure: z.string(), score: z.number() })
  .partial()
  .passthrough()
const CollocationItemOut: z.ZodType<CollocationItemOut> = z
  .object({ item: z.string(), scores: z.array(CollocationScoreOut) })
  .partial()
  .passthrough()
const DiscoursemeScoresOut: z.ZodType<DiscoursemeScoresOut> = z
  .object({
    discourseme_id: z.number().int(),
    global_scores: z.array(CollocationScoreOut),
    item_scores: z.array(CollocationItemOut),
    unigram_item_scores: z.array(CollocationItemOut),
  })
  .partial()
  .passthrough()
const CollocationItemsOut: z.ZodType<CollocationItemsOut> = z
  .object({
    coordinates: z.array(CoordinatesOut).nullable(),
    discourseme_scores: z.array(DiscoursemeScoresOut).nullable(),
    id: z.number().int(),
    items: z.array(CollocationItemOut),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
  })
  .partial()
  .passthrough()
const SemanticMapOut = z
  .object({
    collocation_id: z.number().int(),
    id: z.number().int(),
    keyword_id: z.number().int(),
    p: z.string(),
  })
  .partial()
  .passthrough()
const DiscoursemeTemplateItem: z.ZodType<DiscoursemeTemplateItem> = z
  .object({
    cqp_query: z.string().nullable(),
    p: z.string().nullable(),
    surface: z.string().nullable(),
  })
  .partial()
  .passthrough()
const DiscoursemeOut: z.ZodType<DiscoursemeOut> = z
  .object({
    comment: z.string().nullable(),
    id: z.number().int(),
    name: z.string().nullable(),
    template: z.array(DiscoursemeTemplateItem),
  })
  .partial()
  .passthrough()
const ConstellationOut: z.ZodType<ConstellationOut> = z
  .object({
    description: z.string().nullable(),
    filter_discoursemes: z.array(DiscoursemeOut),
    highlight_discoursemes: z.array(DiscoursemeOut),
    id: z.number().int(),
    name: z.string().nullable(),
  })
  .partial()
  .passthrough()
const ConstellationIn = z
  .object({
    description: z.string(),
    filter_discourseme_ids: z.array(z.number()).default([]),
    highlight_discourseme_ids: z.array(z.number()).default([]),
    name: z.string(),
  })
  .partial()
  .passthrough()
const ConstellationInUpdate = z
  .object({
    description: z.string(),
    filter_discourseme_ids: z.array(z.number()).default([]),
    highlight_discourseme_ids: z.array(z.number()).default([]),
    name: z.string(),
  })
  .partial()
  .passthrough()
const AddDiscoursemeIdIn = z
  .object({ discourseme_id: z.number().int() })
  .partial()
  .passthrough()
const DiscoursemeRangeOut: z.ZodType<DiscoursemeRangeOut> = z
  .object({
    discourseme_id: z.number().int(),
    end: z.number().int(),
    start: z.number().int(),
  })
  .partial()
  .passthrough()
const TokenOut: z.ZodType<TokenOut> = z
  .object({
    cpos: z.number().int(),
    is_filter_item: z.boolean(),
    offset: z.number().int(),
    out_of_window: z.boolean(),
    primary: z.string(),
    secondary: z.string(),
  })
  .partial()
  .passthrough()
const ConcordanceLineOut: z.ZodType<ConcordanceLineOut> = z
  .object({
    discourseme_ranges: z.array(DiscoursemeRangeOut),
    id: z.number().int(),
    structural: z.object({}).partial().passthrough(),
    tokens: z.array(TokenOut),
  })
  .partial()
  .passthrough()
const ConcordanceOut: z.ZodType<ConcordanceOut> = z
  .object({
    lines: z.array(ConcordanceLineOut),
    nr_lines: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
  })
  .partial()
  .passthrough()
const RemoveDiscoursemeIdIn = z
  .object({ discourseme_id: z.number().int() })
  .partial()
  .passthrough()
const CorpusOut: z.ZodType<CorpusOut> = z
  .object({
    cwb_id: z.string(),
    description: z.string().nullable(),
    id: z.number().int(),
    language: z.string().nullable(),
    name: z.string().nullable(),
    p_atts: z.array(z.string()),
    register: z.string().nullable(),
    s_annotations: z.array(z.string()),
    s_atts: z.array(z.string()),
  })
  .partial()
  .passthrough()
const AnnotationsOut: z.ZodType<AnnotationsOut> = z
  .object({
    key: z.string(),
    value_type: z.enum(['datetime', 'numeric', 'boolean', 'unicode']),
  })
  .partial()
  .passthrough()
const MetaOut: z.ZodType<MetaOut> = z
  .object({ annotations: z.array(AnnotationsOut), level: z.string() })
  .partial()
  .passthrough()
const MetaIn = z
  .object({
    key: z.string(),
    level: z.string(),
    value_type: z.enum(['datetime', 'numeric', 'boolean', 'unicode']),
  })
  .partial()
  .passthrough()
const MetaFrequenciesOut = z
  .object({
    nr_spans: z.number().int(),
    nr_tokens: z.number().int(),
    value: z.string(),
  })
  .partial()
  .passthrough()
const SubCorpusOut: z.ZodType<SubCorpusOut> = z
  .object({
    corpus: CorpusOut,
    description: z.string().nullable(),
    id: z.number().int(),
    name: z.string().nullable(),
    nqr_cqp: z.string().nullable(),
  })
  .partial()
  .passthrough()
const SubCorpusIn = z
  .object({
    create_nqr: z.boolean().default(true),
    description: z.string().nullable(),
    key: z.string(),
    level: z.string(),
    name: z.string(),
    value_boolean: z.boolean().nullable(),
    values_numeric: z.array(z.number()).nullable(),
    values_unicode: z.array(z.string()).nullable(),
  })
  .partial()
  .passthrough()
const DiscoursemeIn: z.ZodType<DiscoursemeIn> = z
  .object({
    comment: z.string(),
    name: z.string(),
    template: z.array(DiscoursemeTemplateItem),
  })
  .partial()
  .passthrough()
const DiscoursemeInUpdate: z.ZodType<DiscoursemeInUpdate> = z
  .object({
    comment: z.string(),
    name: z.string(),
    template: z.array(DiscoursemeTemplateItem),
  })
  .partial()
  .passthrough()
const DiscoursemeDescriptionItem: z.ZodType<DiscoursemeDescriptionItem> = z
  .object({ item: z.string() })
  .partial()
  .passthrough()
const DiscoursemeDescriptionOut: z.ZodType<DiscoursemeDescriptionOut> = z
  .object({
    corpus_id: z.number().int(),
    discourseme_id: z.number().int(),
    id: z.number().int(),
    items: z.array(DiscoursemeDescriptionItem),
    match_strategy: z.string(),
    p: z.string(),
    query_id: z.number().int(),
    s: z.string(),
    semantic_map_id: z.number().int(),
    subcorpus_id: z.number().int(),
  })
  .partial()
  .passthrough()
const DiscoursemeDescriptionIn = z
  .object({
    corpus_id: z.number().int(),
    items: z.array(z.string()).optional(),
    match_strategy: z
      .enum(['longest', 'shortest', 'standard'])
      .optional()
      .default('longest'),
    p: z.string().optional(),
    s: z.string().optional(),
    subcorpus_id: z.number().int().optional(),
  })
  .passthrough()
const KeywordOut = z
  .object({
    constellation_id: z.number().int().nullable(),
    corpus_id: z.number().int(),
    corpus_id_reference: z.number().int(),
    id: z.number().int(),
    min_freq: z.number().int(),
    nr_items: z.number().int(),
    p: z.string(),
    p_reference: z.string(),
    semantic_map_id: z.number().int().nullable(),
    sub_vs_rest: z.boolean(),
    subcorpus_id: z.number().int().nullable(),
    subcorpus_id_reference: z.number().int().nullable(),
  })
  .partial()
  .passthrough()
const KeywordIn = z
  .object({
    constellation_id: z.number().int().nullish(),
    corpus_id: z.number().int(),
    corpus_id_reference: z.number().int(),
    min_freq: z.number().int().optional().default(3),
    p: z.string().optional().default('lemma'),
    p_reference: z.string().optional().default('lemma'),
    semantic_map_id: z.number().int().nullish(),
    sub_vs_rest: z.boolean().optional().default(true),
    subcorpus_id: z.number().int().nullish(),
    subcorpus_id_reference: z.number().int().nullish(),
  })
  .passthrough()
const KeywordPatchIn = z
  .object({
    constellation_id: z.number().int().nullable(),
    semantic_map_id: z.number().int().nullable(),
  })
  .partial()
  .passthrough()
const KeywordScoreOut: z.ZodType<KeywordScoreOut> = z
  .object({ measure: z.string(), score: z.number() })
  .partial()
  .passthrough()
const KeywordItemOut: z.ZodType<KeywordItemOut> = z
  .object({ item: z.string(), scores: z.array(KeywordScoreOut) })
  .partial()
  .passthrough()
const KeywordItemsOut: z.ZodType<KeywordItemsOut> = z
  .object({
    coordinates: z.array(CoordinatesOut).nullable(),
    discourseme_scores: z.array(DiscoursemeScoresOut).nullable(),
    id: z.number().int(),
    items: z.array(KeywordItemOut),
    nr_items: z.number().int(),
    page_count: z.number().int(),
    page_number: z.number().int(),
    page_size: z.number().int(),
    sort_by: z.string(),
  })
  .partial()
  .passthrough()
const QueryOut = z
  .object({
    corpus_id: z.number().int(),
    corpus_name: z.string(),
    cqp_query: z.string(),
    discourseme_id: z.number().int().nullable(),
    discourseme_name: z.string().nullable(),
    id: z.number().int(),
    match_strategy: z.string(),
    nqr_cqp: z.string(),
    random_seed: z.number().int(),
    subcorpus_id: z.number().int().nullable(),
    subcorpus_name: z.string().nullable(),
  })
  .partial()
  .passthrough()
const QueryIn = z
  .object({
    corpus_id: z.number().int(),
    cqp_query: z.string(),
    discourseme_id: z.number().int().nullish(),
    match_strategy: z.enum(['longest', 'shortest', 'standard']).optional(),
    s: z.string().optional(),
    subcorpus_id: z.number().int().optional(),
  })
  .passthrough()
const QueryAssistedIn = z
  .object({
    corpus_id: z.number().int(),
    discourseme_id: z.number().int().nullish(),
    escape: z.boolean().optional(),
    ignore_case: z.boolean().optional(),
    ignore_diacritics: z.boolean().optional(),
    items: z.array(z.string()),
    match_strategy: z.enum(['longest', 'shortest', 'standard']).optional(),
    p: z.string(),
    s: z.string().optional(),
    subcorpus_id: z.number().int().optional(),
  })
  .passthrough()
const BreakdownItemsOut: z.ZodType<BreakdownItemsOut> = z
  .object({
    breakdown_id: z.number().int(),
    freq: z.number().int(),
    id: z.number().int(),
    ipm: z.number(),
    item: z.string(),
    nr_tokens: z.number().int(),
  })
  .partial()
  .passthrough()
const BreakdownOut: z.ZodType<BreakdownOut> = z
  .object({
    id: z.number().int(),
    items: z.array(BreakdownItemsOut),
    p: z.string(),
    query_id: z.number().int(),
  })
  .partial()
  .passthrough()
const QueryMetaOut = z
  .object({
    frequency: z.number().int(),
    ipm: z.number(),
    item: z.string(),
    nr_texts: z.number().int(),
    nr_tokens: z.number().int(),
    value: z.string(),
  })
  .partial()
  .passthrough()
const CollocationIdsIn = z
  .object({ collocation_ids: z.array(z.number()) })
  .partial()
  .passthrough()
const CoordinatesIn = z
  .object({
    item: z.string(),
    x_user: z.number().nullish(),
    y_user: z.number().nullish(),
  })
  .passthrough()
const UserOut = z
  .object({ id: z.number().int(), username: z.string() })
  .passthrough()
const UserRegister = z
  .object({
    confirm_password: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    password: z.string(),
    username: z.string(),
  })
  .passthrough()
const UserIn = z
  .object({ password: z.string(), username: z.string() })
  .passthrough()
const HTTPTokenOut = z
  .object({ access_token: z.string(), refresh_token: z.string() })
  .partial()
  .passthrough()
const HTTPRefreshTokenIn = z
  .object({ refresh_token: z.string() })
  .partial()
  .passthrough()
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
  CollocationPatchIn,
  ValidationError,
  CoordinatesOut,
  CollocationScoreOut,
  CollocationItemOut,
  DiscoursemeScoresOut,
  CollocationItemsOut,
  SemanticMapOut,
  DiscoursemeTemplateItem,
  DiscoursemeOut,
  ConstellationOut,
  ConstellationIn,
  ConstellationInUpdate,
  AddDiscoursemeIdIn,
  DiscoursemeRangeOut,
  TokenOut,
  ConcordanceLineOut,
  ConcordanceOut,
  RemoveDiscoursemeIdIn,
  CorpusOut,
  AnnotationsOut,
  MetaOut,
  MetaIn,
  MetaFrequenciesOut,
  SubCorpusOut,
  SubCorpusIn,
  DiscoursemeIn,
  DiscoursemeInUpdate,
  DiscoursemeDescriptionItem,
  DiscoursemeDescriptionOut,
  DiscoursemeDescriptionIn,
  KeywordOut,
  KeywordIn,
  KeywordPatchIn,
  KeywordScoreOut,
  KeywordItemOut,
  KeywordItemsOut,
  QueryOut,
  QueryIn,
  QueryAssistedIn,
  BreakdownItemsOut,
  BreakdownOut,
  QueryMetaOut,
  CollocationIdsIn,
  CoordinatesIn,
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
    alias: 'get',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/collocation/',
    alias: 'getCollocation',
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
    alias: 'deleteCollocationId',
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
    alias: 'getCollocationId',
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
    method: 'patch',
    path: '/collocation/:id/',
    alias: 'patchCollocationId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CollocationPatchIn,
      },
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
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'put',
    path: '/collocation/:id/auto-associate',
    alias: 'putCollocationIdautoAssociate',
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
    path: '/collocation/:id/items',
    alias: 'getCollocationIditems',
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
            'conservative_log_ratio',
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
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
    alias: 'postCollocationIdsemanticMap',
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
        schema: z.number().int().nullish(),
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
    path: '/constellation/',
    alias: 'getConstellation',
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
    path: '/constellation/',
    alias: 'postConstellation',
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
    path: '/constellation/:id',
    alias: 'deleteConstellationId',
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
    path: '/constellation/:id',
    alias: 'getConstellationId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    path: '/constellation/:id',
    alias: 'patchConstellationId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConstellationInUpdate,
      },
      {
        name: 'id',
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
    path: '/constellation/:id/add-discourseme',
    alias: 'patchConstellationIdaddDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z
          .object({ discourseme_id: z.number().int() })
          .partial()
          .passthrough(),
      },
      {
        name: 'id',
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
    path: '/constellation/:id/corpus/:corpus_id/collocation/',
    alias: 'getConstellationIdcorpusCorpus_idcollocation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'corpus_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Query',
        schema: z.number().int().nullish(),
      },
      {
        name: 'constellation_id',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'semantic_map_id',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 's_break',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'marginals',
        type: 'Query',
        schema: z.enum(['local', 'global']).optional().default('local'),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number()).optional().default([]),
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
    path: '/constellation/:id/corpus/:corpus_id/concordance/',
    alias: 'getConstellationIdcorpusCorpus_idconcordance',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'corpus_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'subcorpus_id',
        type: 'Query',
        schema: z.number().int().nullish(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(50),
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
          .enum(['first', 'random', 'ascending', 'descending'])
          .optional()
          .default('random'),
      },
      {
        name: 'sort_by_offset',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'sort_by_p_att',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'sort_by_s_att',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number()).optional().default([]),
      },
      {
        name: 'highlight_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number()).optional().default([]),
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
    method: 'patch',
    path: '/constellation/:id/remove-discourseme',
    alias: 'patchConstellationIdremoveDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z
          .object({ discourseme_id: z.number().int() })
          .partial()
          .passthrough(),
      },
      {
        name: 'id',
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
    path: '/corpus/',
    alias: 'getCorpus',
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
    alias: 'getCorpusId',
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
    path: '/corpus/:id/meta/',
    alias: 'getCorpusIdmeta',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(MetaOut),
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
    alias: 'putCorpusIdmeta',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: MetaIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: AnnotationsOut,
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
    alias: 'getCorpusIdmetafrequencies',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'level',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'key',
        type: 'Query',
        schema: z.string().optional(),
      },
    ],
    response: z.array(MetaFrequenciesOut),
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
    path: '/corpus/:id/subcorpus/',
    alias: 'getCorpusIdsubcorpus',
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
    alias: 'putCorpusIdsubcorpus',
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
    method: 'get',
    path: '/discourseme/',
    alias: 'getDiscourseme',
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
    path: '/discourseme/',
    alias: 'postDiscourseme',
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
    path: '/discourseme/:id',
    alias: 'deleteDiscoursemeId',
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
    path: '/discourseme/:id',
    alias: 'getDiscoursemeId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    path: '/discourseme/:id',
    alias: 'patchDiscoursemeId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeInUpdate,
      },
      {
        name: 'id',
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
    path: '/discourseme/:id/description/',
    alias: 'getDiscoursemeIddescription',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    path: '/discourseme/:id/description/',
    alias: 'postDiscoursemeIddescription',
    description: `Will automatically create query (from template / description) if it doesn&#x27;t exist.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeDescriptionIn,
      },
      {
        name: 'id',
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
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/discourseme/:id/description/:description_id/',
    alias: 'deleteDiscoursemeIddescriptionDescription_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    method: 'get',
    path: '/discourseme/:id/description/:description_id/',
    alias: 'getDiscoursemeIddescriptionDescription_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    path: '/discourseme/:id/description/:description_id/add-item',
    alias: 'patchDiscoursemeIddescriptionDescription_idaddItem',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ item: z.string() }).partial().passthrough(),
      },
      {
        name: 'id',
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
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/discourseme/:id/description/:description_id/remove-item',
    alias: 'patchDiscoursemeIddescriptionDescription_idremoveItem',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ item: z.string() }).partial().passthrough(),
      },
      {
        name: 'id',
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
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/hello',
    alias: 'getHello',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/keyword/',
    alias: 'getKeyword',
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
    alias: 'postKeyword',
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
    alias: 'deleteKeywordId',
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
    path: '/keyword/:id/',
    alias: 'getKeywordId',
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
    method: 'patch',
    path: '/keyword/:id/',
    alias: 'patchKeywordId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: KeywordPatchIn,
      },
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
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'get',
    path: '/keyword/:id/items',
    alias: 'getKeywordIditems',
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
            'conservative_log_ratio',
            'O11',
            'E11',
            'ipm',
            'ipm_expected',
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
    alias: 'postKeywordIdsemanticMap',
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
        schema: z.number().int().nullish(),
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
    path: '/query/',
    alias: 'getQuery',
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
    alias: 'postQuery',
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
    path: '/query/:id',
    alias: 'deleteQueryId',
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
    path: '/query/:id',
    alias: 'getQueryId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    method: 'post',
    path: '/query/:id/execute',
    alias: 'postQueryIdexecute',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
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
    alias: 'getQueryQuery_idbreakdown',
    description: `TODO: pagination needed?`,
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
    method: 'get',
    path: '/query/:query_id/collocation',
    alias: 'getQueryQuery_idcollocation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation_id',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'semantic_map_id',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'window',
        type: 'Query',
        schema: z.number().int().optional().default(10),
      },
      {
        name: 's_break',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'marginals',
        type: 'Query',
        schema: z.enum(['local', 'global']).optional().default('local'),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number()).optional().default([]),
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
    alias: 'getQueryQuery_idconcordance',
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
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(50),
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
          .enum(['first', 'random', 'ascending', 'descending'])
          .optional()
          .default('random'),
      },
      {
        name: 'sort_by_offset',
        type: 'Query',
        schema: z.number().int().optional(),
      },
      {
        name: 'sort_by_p_att',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'sort_by_s_att',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'filter_item',
        type: 'Query',
        schema: z.string().nullish(),
      },
      {
        name: 'filter_item_p_att',
        type: 'Query',
        schema: z.string().optional().default('lemma'),
      },
      {
        name: 'filter_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number()).optional().default([]),
      },
      {
        name: 'highlight_discourseme_ids',
        type: 'Query',
        schema: z.array(z.number()).optional().default([]),
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
    alias: 'getQueryQuery_idconcordanceMatch_id',
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
        name: 'extended_window',
        type: 'Query',
        schema: z.number().int().optional().default(50),
      },
      {
        name: 'extended_context_break',
        type: 'Query',
        schema: z.string().optional().default('text'),
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
    alias: 'postQueryQuery_idconcordanceshuffle',
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
    alias: 'getQueryQuery_idmeta',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'level',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'key',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: 'p',
        type: 'Query',
        schema: z.string().optional().default('word'),
      },
    ],
    response: z.array(QueryMetaOut),
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
    alias: 'postQueryassisted',
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
    alias: 'putSemanticMap',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: CollocationIdsIn,
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
    alias: 'deleteSemanticMapId',
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
    alias: 'getSemanticMapId',
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
    path: '/semantic-map/:id/coordinates',
    alias: 'getSemanticMapIdcoordinates',
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
    alias: 'putSemanticMapIdcoordinates',
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
    path: '/user/',
    alias: 'getUser',
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
    alias: 'postUser',
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
    method: 'get',
    path: '/user/:id',
    alias: 'getUserId',
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
    alias: 'patchUserId',
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
    alias: 'getUseridentify',
    requestFormat: 'json',
    response: z.unknown(),
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
    alias: 'postUserlogin',
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
    alias: 'postUserrefresh',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z.object({ refresh_token: z.string() }).partial().passthrough(),
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
