import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core'
import { z } from 'zod'

type CollocationOut = Partial<{
  _query: QueryOut
  constellation_id: number
  context: number
  id: number
  p: string
  s_break: string
  sem_map_id: number
}>
type QueryOut = Partial<{
  corpus: CorpusOut
  cqp_nqr_matches: string
  cqp_query: string
  discourseme_id: number | null
  id: number
  match_strategy: string
  nqr_name: string | null
  subcorpus: string | null
}>
type CorpusOut = Partial<{
  cwb_id: string
  description: string
  id: number
  language: string
  name: string
  p_atts: Array<string>
  register: string
  s_atts: Array<string>
}>
type ConstellationOut = Partial<{
  description: string
  highlight_discoursemes: Array<DiscoursemeOut>
  id: number
  name: string
}>
type DiscoursemeOut = Partial<{
  _items: Array<string>
  description: string
  id: number
  name: string
}>
type SubCorpusOut = Partial<{
  corpus: CorpusOut
  cqp_nqr_matches: string
  description: string
  id: number
  name: string
}>

const BreakdownOut = z
  .object({ id: z.number().int(), p: z.string(), query_id: z.number().int() })
  .partial()
  .passthrough()
const HTTPError = z
  .object({ detail: z.object({}).partial().passthrough(), message: z.string() })
  .partial()
  .passthrough()
const BreakdownIn = z
  .object({ p: z.string(), query_id: z.number().int() })
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
const BreakdownItemsOut = z
  .object({
    breakdown_id: z.number().int(),
    freq: z.number().int(),
    id: z.number().int(),
    item: z.string(),
  })
  .partial()
  .passthrough()
const CorpusOut: z.ZodType<CorpusOut> = z
  .object({
    cwb_id: z.string(),
    description: z.string(),
    id: z.number().int(),
    language: z.string(),
    name: z.string(),
    p_atts: z.array(z.string()),
    register: z.string(),
    s_atts: z.array(z.string()),
  })
  .partial()
  .passthrough()
const QueryOut: z.ZodType<QueryOut> = z
  .object({
    corpus: CorpusOut,
    cqp_nqr_matches: z.string(),
    cqp_query: z.string(),
    discourseme_id: z.number().int().nullable(),
    id: z.number().int(),
    match_strategy: z.string(),
    nqr_name: z.string().nullable(),
    subcorpus: z.string().nullable(),
  })
  .partial()
  .passthrough()
const CollocationOut: z.ZodType<CollocationOut> = z
  .object({
    _query: QueryOut,
    constellation_id: z.number().int(),
    context: z.number().int(),
    id: z.number().int(),
    p: z.string(),
    s_break: z.string(),
    sem_map_id: z.number().int(),
  })
  .partial()
  .passthrough()
const CollocationIn = z
  .object({
    constellation_id: z.number().int(),
    context: z.number().int(),
    p: z.string(),
    query_id: z.number().int(),
    s_break: z.string(),
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
const SemanticMapIn = z
  .object({ collocation_id: z.number().int() })
  .partial()
  .passthrough()
const DiscoursemeOut: z.ZodType<DiscoursemeOut> = z
  .object({
    _items: z.array(z.string()),
    description: z.string(),
    id: z.number().int(),
    name: z.string(),
  })
  .partial()
  .passthrough()
const ConstellationOut: z.ZodType<ConstellationOut> = z
  .object({
    description: z.string(),
    highlight_discoursemes: z.array(DiscoursemeOut),
    id: z.number().int(),
    name: z.string(),
  })
  .partial()
  .passthrough()
const ConstellationIn = z
  .object({
    description: z.string(),
    filter_discourseme_ids: z.array(z.number()),
    highlight_discourseme_ids: z.array(z.number()),
    name: z.string(),
  })
  .partial()
  .passthrough()
const SubCorpusOut: z.ZodType<SubCorpusOut> = z
  .object({
    corpus: CorpusOut,
    cqp_nqr_matches: z.string(),
    description: z.string(),
    id: z.number().int(),
    name: z.string(),
  })
  .partial()
  .passthrough()
const DiscoursemeIn = z
  .object({ description: z.string(), name: z.string() })
  .partial()
  .passthrough()
const DiscoursemeQueryIn = z
  .object({
    corpus_id: z.number().int(),
    escape: z.boolean(),
    flags: z.string(),
    match_strategy: z.string().default('longest'),
    nqr_name: z.string().nullable(),
    p_query: z.string().default('lemma'),
    s_query: z.string().nullable(),
  })
  .partial()
  .passthrough()
const QueryIn = z
  .object({
    corpus_id: z.number().int(),
    cqp_query: z.string(),
    discourseme_id: z.number().int().nullable(),
    match_strategy: z.enum(['longest', 'shortest', 'standard']),
    nqr_name: z.string().nullable(),
  })
  .partial()
  .passthrough()
const QueryAssistedIn = z
  .object({
    corpus_id: z.number().int(),
    discourseme_id: z.number().int().nullable(),
    escape: z.boolean(),
    flags: z.enum(['%cd', '%c', '%d', '']),
    items: z.array(z.string()),
    match_strategy: z.enum(['longest', 'shortest', 'standard']),
    nqr_name: z.string().nullable(),
    p: z.string(),
    s: z.string(),
  })
  .partial()
  .passthrough()
const ConcordanceIn = z
  .object({
    context_break: z.string(),
    cut_off: z.number().int(),
    order: z.number().int(),
    p_show: z.array(z.string()),
    s_show: z.array(z.string()),
    window: z.number().int(),
  })
  .partial()
  .passthrough()
const ConcordanceLinesOut = z
  .object({
    match: z.number().int(),
    positional: z.string(),
    structural: z.string(),
  })
  .partial()
  .passthrough()
const CoordinatesOut = z
  .object({
    id: z.number().int(),
    item: z.string(),
    semantic_map_id: z.number().int(),
    x: z.number(),
    x_user: z.number(),
    y: z.number(),
    y_user: z.number(),
  })
  .partial()
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
const TokenOut = z.object({ access_token: z.string() }).partial().passthrough()
const UserUpdate = z
  .object({
    confirm_password: z.string(),
    new_password: z.string(),
    old_password: z.string(),
  })
  .passthrough()

export const schemas = {
  BreakdownOut,
  HTTPError,
  BreakdownIn,
  ValidationError,
  BreakdownItemsOut,
  CorpusOut,
  QueryOut,
  CollocationOut,
  CollocationIn,
  SemanticMapOut,
  SemanticMapIn,
  DiscoursemeOut,
  ConstellationOut,
  ConstellationIn,
  SubCorpusOut,
  DiscoursemeIn,
  DiscoursemeQueryIn,
  QueryIn,
  QueryAssistedIn,
  ConcordanceIn,
  ConcordanceLinesOut,
  CoordinatesOut,
  UserOut,
  UserRegister,
  UserIn,
  TokenOut,
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
    method: 'delete',
    path: '/breakdown/:id',
    alias: 'deleteBreakdownId',
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
    path: '/breakdown/:id',
    alias: 'getBreakdownId',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
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
    ],
  },
  {
    method: 'post',
    path: '/breakdown/:id/execute',
    alias: 'postBreakdownIdexecute',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
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
    ],
  },
  {
    method: 'get',
    path: '/breakdown/:id/items',
    alias: 'getBreakdownIditems',
    requestFormat: 'json',
    parameters: [
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(BreakdownItemsOut),
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
    path: '/breakdown/query/:query_id',
    alias: 'getBreakdownqueryQuery_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(BreakdownOut),
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
    path: '/breakdown/query/:query_id',
    alias: 'postBreakdownqueryQuery_id',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: BreakdownIn,
      },
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'execute',
        type: 'Query',
        schema: z.boolean().optional().default(true),
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
    path: '/collocation/:id',
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
    path: '/collocation/:id',
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
    path: '/collocation/:id/collocates',
    alias: 'getCollocationIdcollocates',
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
    method: 'post',
    path: '/collocation/:id/collocates',
    alias: 'postCollocationIdcollocates',
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
    path: '/collocation/:id/semantic_map/',
    alias: 'getCollocationIdsemantic_map',
    description: `TODO: allow many-to-many relationship`,
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
    method: 'post',
    path: '/collocation/:id/semantic_map/',
    alias: 'postCollocationIdsemantic_map',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: z
          .object({ collocation_id: z.number().int() })
          .partial()
          .passthrough(),
      },
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
      {
        status: 422,
        description: `Validation error`,
        schema: ValidationError,
      },
    ],
  },
  {
    method: 'post',
    path: '/collocation/query/:query_id',
    alias: 'postCollocationqueryQuery_id',
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
      {
        name: 'execute',
        type: 'Query',
        schema: z.boolean().optional().default(true),
      },
      {
        name: 'semantic_map_id',
        type: 'Query',
        schema: z.number().int().nullish(),
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
    path: '/corpus/:id/meta',
    alias: 'getCorpusIdmeta',
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
    method: 'put',
    path: '/corpus/:id/meta',
    alias: 'putCorpusIdmeta',
    description: `- from within XML
- from TSV`,
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
    path: '/corpus/:id/subcorpora/',
    alias: 'getCorpusIdsubcorpora',
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
    path: '/corpus/:id/subcorpus',
    alias: 'putCorpusIdsubcorpus',
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
    method: 'post',
    path: '/discourseme/:id/query',
    alias: 'postDiscoursemeIdquery',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: DiscoursemeQueryIn,
      },
      {
        name: 'id',
        type: 'Path',
        schema: z.string(),
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
    path: '/mmda/admin/collocation/',
    alias: 'getMmdaadmincollocation',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'delete',
    path: '/mmda/admin/collocation/:collocation/',
    alias: 'deleteMmdaadmincollocationCollocation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/admin/constellation/',
    alias: 'getMmdaadminconstellation',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'delete',
    path: '/mmda/admin/constellation/:constellation/',
    alias: 'deleteMmdaadminconstellationConstellation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/admin/discourseme/',
    alias: 'getMmdaadmindiscourseme',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'delete',
    path: '/mmda/admin/discourseme/:discourseme/',
    alias: 'deleteMmdaadmindiscoursemeDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/admin/keyword/',
    alias: 'getMmdaadminkeyword',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'delete',
    path: '/mmda/admin/keyword/:keyword/',
    alias: 'deleteMmdaadminkeywordKeyword',
    requestFormat: 'json',
    parameters: [
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/admin/user/',
    alias: 'getMmdaadminuser',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'post',
    path: '/mmda/admin/user/',
    alias: 'postMmdaadminuser',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'delete',
    path: '/mmda/admin/user/:username/',
    alias: 'deleteMmdaadminuserUsername',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/admin/user/:username/password/',
    alias: 'putMmdaadminuserUsernamepassword',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/corpus/',
    alias: 'getMmdacorpus',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/mmda/corpus/:corpus/',
    alias: 'getMmdacorpusCorpus',
    requestFormat: 'json',
    parameters: [
      {
        name: 'corpus',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/login/',
    alias: 'postMmdalogin',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'post',
    path: '/mmda/refresh/',
    alias: 'postMmdarefresh',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/mmda/test-admin/',
    alias: 'getMmdatestAdmin',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/mmda/test-login/',
    alias: 'getMmdatestLogin',
    requestFormat: 'json',
    response: z.unknown(),
  },
  {
    method: 'get',
    path: '/mmda/test-login/:username/',
    alias: 'getMmdatestLoginUsername',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/',
    alias: 'getMmdauserUsername',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/',
    alias: 'putMmdauserUsername',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/',
    alias: 'getMmdauserUsernamecollocation',
    description: `parameters:
- username: username
type: str
description: username, links to user
responses:
200:
description: list of serialized analyses`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/user/:username/collocation/',
    alias: 'postMmdauserUsernamecollocation',
    description: `parameters:
- name: username
type: str

- name: corpus
type: str
description: name of corpus in API
- name: discourseme
type: str or dict
description: new discourseme (&lt;str&gt;) or existing discourseme (&lt;dict&gt;)
- name: items
type: list
description: items to search for

- name: p_query
type: str
description: p-attribute to query on [lemma]
- name: p_collocation
type: str
description: p-attribute to use for collocates [lemma]
- name: s_break
type: str
description: s-attribute to break context at [text]
- name: context
type: int
description: context size in tokens
default: 10

- name: cut_off
type: int
description: how many collocates?
default: 200
- name: order
type: str
description: how to sort them? (column in result table) [log_likelihood]

responses:
201:
description: collocation.id
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/collocation/:collocation/',
    alias: 'deleteMmdauserUsernamecollocationCollocation',
    description: `parameters:
- username: username
type: str
description: username, links to user
- name: collocation
type: str
description: collocation id
responses:
200:
description: &quot;deleted&quot;
404:
description: &quot;no such collocation&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/',
    alias: 'getMmdauserUsernamecollocationCollocation',
    description: `parameters:
- username: username
type: str
description: username, links to user
- name: collocation
type: str
description: collocation id
responses:
200:
description: dict of collocation analysis details
404:
description: &quot;no such analysis&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/breakdown/',
    alias: 'getMmdauserUsernamecollocationCollocationbreakdown',
    description: `parameters:
- name: username
description: username, links to user
- name: collocation
description: collocation_id
responses:
200:
description: breakdown
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/collocate/',
    alias: 'getMmdauserUsernamecollocationCollocationcollocate',
    description: `parameters:
- name: username
description: username, links to user
- name: collocation
description: collocation id

- name: window_size
type: int
description: window size

- name: discourseme
type: list
required: False
description: discourseme id(s) to include in constellation
- name: collocate
type: list
required: False
description: lose item(s) for ad-hoc discourseme to include

- name: cut_off
type: int
description: how many collocates?
default: 200
- name: order
type: str
description: how to sort them? (column in result table) [log_likelihood]

responses:
200:
description: collocates
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/concordance/',
    alias: 'getMmdauserUsernamecollocationCollocationconcordance',
    description: `parameters:
- name: username
description: username, links to user
- name: collocation
description: collocation_id
- name: window_size
type: int
description: window size for context
default: 10
- name: item
type: list
required: False
description: lose item(s) for additional discourseme to include
- name: cut_off
type: int
description: how many lines?
default: 1000
- name: order
type: str
description: how to sort them? (column in result table)
default: random
- name: s_meta
type: str
description: what s-att-annotation to retrieve
default: collocation.s_break
responses:
200:
description: concordance
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/coordinates/',
    alias: 'getMmdauserUsernamecollocationCollocationcoordinates',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/collocation/:collocation/coordinates/',
    alias: 'putMmdauserUsernamecollocationCollocationcoordinates',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/collocation/:collocation/coordinates/reload/',
    alias: 'putMmdauserUsernamecollocationCollocationcoordinatesreload',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/discourseme/',
    alias: 'getMmdauserUsernamecollocationCollocationdiscourseme',
    description: `parameters:
- username: username
type: str
description: username, links to user
- name: collocation
type: str
description: collocation id
responses:
200:
description: list of associated discoursemes
404:
description: &quot;no such collocation&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/collocation/:collocation/discourseme/:discourseme/',
    alias: 'deleteMmdauserUsernamecollocationCollocationdiscoursemeDiscourseme',
    description: `parameters:
- name: username
type: str
description: username, links to user
- name: collocation
type: int
description: collocation id
- name: discourseme
type: int
description: discourseme id to remove
responses:
200:
description: &quot;deleted discourseme from collocation&quot;
404:
description: &quot;no such analysis&quot;
description: &quot;no such discourseme&quot;
description: &quot;discourseme not linked to collocation&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/collocation/:collocation/discourseme/:discourseme/',
    alias: 'putMmdauserUsernamecollocationCollocationdiscoursemeDiscourseme',
    description: `parameters:
- name: username
type: str
description: username, links to user
- name: collocation
type: int
description: collocation id
- name: discourseme
type: int
description: discourseme id to associate
responses:
200:
description: &quot;already linked&quot;
description: &quot;updated&quot;
404:
description: &quot;no such collocation&quot;
description: &quot;no such discourseme&quot;
409:
description: &quot;discourseme is already topic of collocation&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/collocation/:collocation/meta/',
    alias: 'getMmdauserUsernamecollocationCollocationmeta',
    description: `parameters:
- name: username
description: username, links to user
- name: collocation
description: collocation_id
responses:
200:
description: breakdown
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'collocation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/constellation/',
    alias: 'getMmdauserUsernameconstellation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/user/:username/constellation/',
    alias: 'postMmdauserUsernameconstellation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/constellation/:constellation/',
    alias: 'deleteMmdauserUsernameconstellationConstellation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/constellation/:constellation/',
    alias: 'getMmdauserUsernameconstellationConstellation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/constellation/:constellation/',
    alias: 'putMmdauserUsernameconstellationConstellation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/constellation/:constellation/association/',
    alias: 'getMmdauserUsernameconstellationConstellationassociation',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/constellation/:constellation/concordance/',
    alias: 'getMmdauserUsernameconstellationConstellationconcordance',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/constellation/:constellation/discourseme/',
    alias: 'getMmdauserUsernameconstellationConstellationdiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/constellation/:constellation/discourseme/:discourseme/',
    alias:
      'deleteMmdauserUsernameconstellationConstellationdiscoursemeDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/constellation/:constellation/discourseme/:discourseme/',
    alias:
      'putMmdauserUsernameconstellationConstellationdiscoursemeDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'constellation',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/discourseme/',
    alias: 'getMmdauserUsernamediscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/user/:username/discourseme/',
    alias: 'postMmdauserUsernamediscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/discourseme/:discourseme/',
    alias: 'deleteMmdauserUsernamediscoursemeDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/discourseme/:discourseme/',
    alias: 'getMmdauserUsernamediscoursemeDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/discourseme/:discourseme/',
    alias: 'putMmdauserUsernamediscoursemeDiscourseme',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/keyword/',
    alias: 'getMmdauserUsernamekeyword',
    description: `parameters:
- username: username
type: str
description: username, links to user
responses:
200:
description: list of serialized analyses`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'post',
    path: '/mmda/user/:username/keyword/',
    alias: 'postMmdauserUsernamekeyword',
    description: `parameters:
- name: username
type: str

- name: corpus
type: str
description: name of corpus in API
- name: corpus_reference
type: str
description: name of corpus in API

- name: p
type: list
description: p-attributes to query on [lemma]
- name: p_reference
type: list
description: p-attributes to query on [lemma]

- name: s_break
type: str
description: where to limit concordance lines

- name: cut_off
type: int
description: how many keywords? [None]
default: 500
- name: order
type: str
description: how to sort them? (column in result table) [log_likelihood]

responses:
201:
description: keywords.id
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/keyword/:keyword/',
    alias: 'deleteMmdauserUsernamekeywordKeyword',
    description: `parameters:
- username: username
type: str
description: username, links to user
- name: keyword
type: str
description: keyword analysis id
responses:
200:
description: &quot;deleted&quot;
404:
description: &quot;no such keyword analysis&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/keyword/:keyword/',
    alias: 'getMmdauserUsernamekeywordKeyword',
    description: `parameters:
- username: username
type: str
description: username, links to user
- name: keyword_id
type: str
description: keyword id
responses:
200:
description: dict of keyword details
404:
description: &quot;no such analysis&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/keyword/:keyword/concordance/',
    alias: 'getMmdauserUsernamekeywordKeywordconcordance',
    description: `parameters:
- name: username
description: username, links to user
- name: keyword
description: keyword_analysis_id
- name: item
type: str
description: item to get lines for
- name: cut_off
type: int
description: how many lines?
default: 500
- name: order
type: str
description: how to sort them? (column in result table)
default: random
responses:
200:
description: concordance
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/keyword/:keyword/coordinates/',
    alias: 'getMmdauserUsernamekeywordKeywordcoordinates',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/keyword/:keyword/coordinates/',
    alias: 'putMmdauserUsernamekeywordKeywordcoordinates',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/keyword/:keyword/coordinates/reload/',
    alias: 'putMmdauserUsernamekeywordKeywordcoordinatesreload',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/keyword/:keyword/discourseme/',
    alias: 'getMmdauserUsernamekeywordKeyworddiscourseme',
    description: `parameters:
- username: username
type: str
description: username, links to user
- name: keyword
type: str
description: keyword analysis id
responses:
200:
description: list of associated discoursemes
404:
description: &quot;no such keyword analysis&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/mmda/user/:username/keyword/:keyword/discourseme/:discourseme/',
    alias: 'deleteMmdauserUsernamekeywordKeyworddiscoursemeDiscourseme',
    description: `parameters:
- name: username
type: str
description: username, links to user
- name: keyword
type: int
description: keyword analysis id
- name: discourseme
type: int
description: discourseme id to remove
responses:
200:
description: &quot;deleted discourseme from keyword analysis&quot;
404:
description: &quot;no such keyword analysis&quot;
description: &quot;no such discourseme&quot;
description: &quot;discourseme not linked to keyword analysis&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/keyword/:keyword/discourseme/:discourseme/',
    alias: 'putMmdauserUsernamekeywordKeyworddiscoursemeDiscourseme',
    description: `parameters:
- name: username
type: str
description: username, links to user
- name: keyword
type: int
description: keyword analysis id
- name: discourseme
type: int
description: discourseme id to associate
responses:
200:
description: &quot;already linked&quot;
description: &quot;updated&quot;
404:
description: &quot;no such keyword analysis&quot;
description: &quot;no such discourseme&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'discourseme',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'get',
    path: '/mmda/user/:username/keyword/:keyword/keywords/',
    alias: 'getMmdauserUsernamekeywordKeywordkeywords',
    description: `parameters:
- name: username
description: username, links to user
- name: analysis
description: analysis id

- name: window_size
type: int
description: window size

- name: discourseme
type: list
required: False
description: discourseme id(s) to include in constellation
- name: collocate
type: list
required: False
description: lose item(s) for ad-hoc discourseme to include

- name: cut_off
type: int
description: how many collocates?
default: 500
- name: order
type: str
description: how to sort them? (column in result table) [log_likelihood]

responses:
200:
description: collocates
400:
description: &quot;wrong request parameters&quot;
404:
description: &quot;empty result&quot;`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
      {
        name: 'keyword',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
      },
    ],
  },
  {
    method: 'put',
    path: '/mmda/user/:username/password/',
    alias: 'putMmdauserUsernamepassword',
    requestFormat: 'json',
    parameters: [
      {
        name: 'username',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Not found`,
        schema: HTTPError,
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
    path: '/query/:query_id/concordance/',
    alias: 'getQueryQuery_idconcordance',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        type: 'Body',
        schema: ConcordanceIn,
      },
      {
        name: 'query_id',
        type: 'Path',
        schema: z.string(),
      },
    ],
    response: z.array(ConcordanceLinesOut),
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
    method: 'delete',
    path: '/semantic_map/:id',
    alias: 'deleteSemantic_mapId',
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
    path: '/semantic_map/:id',
    alias: 'getSemantic_mapId',
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
    path: '/semantic_map/:id/coordinates',
    alias: 'getSemantic_mapIdcoordinates',
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
    response: z.object({ access_token: z.string() }).partial().passthrough(),
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
