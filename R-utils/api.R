## An ad-hoc R client API for cwb-cads servers
library(tidyverse)
library(magrittr)
library(httr2)
library(jsonlite)

# global variables set by cads_connect() and implicitly used by all other functions
if (!exists(".cads.token")) .cads.token <- NULL
if (!exists(".cads.url")) .cads.url <- NULL
if (!exists(".cads.cid")) .cads.cid <- NULL # can be set by cads_activate_corpus()

# SETUP ####

## perform request and extract JSON body
cads_perform_request <- function (req) {
  req |> req_perform() |> extract2("body") |> rawToChar() |> fromJSON()
}

## connect to server (sets .access.token and .url.api, and invisibly returns access token)
cads_connect <- function(user, password, url="https://corpora.linguistik.uni-erlangen.de/cwb-cads-beta/") {
  str_interp("${url}/user/login") |>
  request() |>
  req_method("POST") |>
  req_body_form(username=user, password=password) |>
  cads_perform_request() |>
  extract2("access_token") ->> .cads.token
  .cads.url <<- url
  invisible(.cads.token)
}

## create request for specified API end point and set auth token
cads_mk_request <- function (path, url=.cads.url, token=.cads.token) {
  str_interp("${url}/${path}") |>
    request() |>
    req_auth_bearer_token(token)
}

# CORPORA ####

## list all corpora
cads_list_corpora <- function () {
  cads_mk_request("corpus") |>
    cads_perform_request() |>
    tibble()
}

## activate corpus with given CWB name (automatically used as default henceforth)
cads_activate_corpus <- function (cwbname) {
  cads_list_corpora() |>
    filter(cwb_id == cwbname) |>
    pull(id) ->> .cads.cid
  structure(.cads.cid, names=cwbname)
}

## corpus metadata
cads_corpus_metadata <- function (corpus.id=.cads.cid) {
  str_interp("corpus/${corpus.id}/meta") |>
    cads_mk_request() |>
    cads_perform_request() |> 
    magrittr::extract2("levels") |> 
    unnest(annotations)
}

## frequency distribution for metadata
cads_metadata_frequencies <- function (level, attribute, max.items=1e6, corpus.id=.cads.cid, subcorpus.id=NULL) {
  str_interp("corpus/${corpus.id}/meta/frequencies") |>
    cads_mk_request() |>
    req_url_query(level=level, key=attribute, page_size=max.items, subcorpus_id=subcorpus.id) |>
    req_auth_bearer_token(.cads.token) |>
    cads_perform_request()
}

## list subcorpora
cads_list_subcorpora <- function (corpus.id=.cads.cid) {
  str_interp("corpus/${corpus.id}/subcorpus") |>
    cads_mk_request() |>
    cads_perform_request() |>
    tibble()
}

## create subcorpus
cads_create_subcorpus <- function(name, level, key, bins_unicode = NULL, bins_datetime = NULL, corpus.id = .cads.cid, subcorpus.id = NULL){
  subcorpus <- str_interp("corpus/${corpus.id}/subcorpus/") |>
    cads_mk_request() |> 
    req_body_json(list(name = name, level = level, key = key, bins_unicode = bins_unicode, bins_datetime = bins_datetime, subcorpus_id = subcorpus.id)) |>
    req_method('put') |>
    # req_dry_run()
    cads_perform_request()
}

## get subcorpus
cads_get_subcorpus <- function(subcorpus.id, corpus.id = .cads.cid){
  collection <- str_interp("/corpus/${corpus.id}/subcorpus/${subcorpus.id}") |>
    cads_mk_request() |> 
    cads_perform_request()
}

## create subcorpus collection
cads_create_subcorpus_collection <- function(name, level, key, time_interval = "year", corpus.id = .cads.cid){
  collection <- str_interp("/corpus/${corpus.id}/subcorpus-collection/") |>
    cads_mk_request() |> 
    req_body_json(list(name = name, level = level, key = key, time_interval = time_interval)) |>
    req_method('put') |>
    cads_perform_request()
}

# QUERIES ####

## list queries (set corpus.id=NULL and subcorpus.id=NULL to see all queries; subcorpus.id=NA only shows queries on full corpus)
cads_list_queries <- function (corpus.id=.cads.cid, subcorpus.id=NA) {
  str_interp("query") |>
    cads_mk_request() |>
    cads_perform_request() |>
    tibble() ->
    res
  if (!is.null(corpus.id)) res <- filter(res, corpus_id %in% corpus.id)
  if (!is.null(subcorpus.id)) {
    if (is.na(subcorpus.id)) res <- filter(res, is.na(subcorpus_id))
    else res <- filter(res, subcorpus_id %in% subcorpus.id)
  }
  res
}

## run a new query
cads_run_simple_query <- function (items, p.att="word", s.att="s", strategy="longest", case.ignore=FALSE, diac.ignore=FALSE, corpus.id=.cads.cid, subcorpus.id=NULL) {
  if (is.character(items)) items <- as.list(items)
  cads_mk_request("query/assisted") |>
    req_body_json(list(
      items=items, p=p.att, s=s.att, ignore_case=case.ignore, ignore_diacritics=diac.ignore,
      corpus_id=corpus.id, subcorpus_id=subcorpus.id)) |>
    req_method('PUT') |> 
    cads_perform_request()
}

## frequency breakdown of query matches
cads_query_breakdown <- function (query.id, p.att="word") {
  str_interp("query/${query.id}/breakdown") |>
    cads_mk_request() |>
    req_url_query(p=p.att) |>
    cads_perform_request()
}

## frequency distribution across meta data
cads_query_meta <- function(query.id, level, key, p.att = "word", page.size = 1000, time.interval = "day"){
  str_interp("query/${query.id}/meta") |> 
    cads_mk_request() |> 
    req_url_query(p_att = p.att, level = level, key = key, page_size = page.size, time_interval = time.interval) |> 
    cads_perform_request()
} 

## obtain concordance for given query ID 
## TODO many additional attributes will need to be implemented
cads_query_concordance <- function (query.id, page=1, page.size=20, window=10, boundary=NULL, primary.att="word", secondary.att="lemma") {
  str_interp("query/${query.id}/concordance") |>
    cads_mk_request() |>
    req_url_query(page=page, page_size=page.size, window=window, context_break=boundary, primary=primary.att, secondary=secondary.att) |>
    cads_perform_request()
}

# DISCOURSEMES ####

## list discoursemes
cads_list_discoursemes <- function() {
  str_interp("mmda/discourseme/") |> 
    cads_mk_request() |> 
    cads_perform_request()
}

## create discourseme
cads_create_discourseme <- function(name) {
  str_interp("mmda/discourseme/") |> 
    cads_mk_request() |> 
    req_body_json(list(name = name)) |> 
    req_method("POST") |>
    cads_perform_request()
}

## create discourseme description
cads_create_discourseme_description <- function(discourseme.id, items, p.att = "lemma", corpus.id = .cads.cid) {
  str_interp("mmda/discourseme/${discourseme.id}/description/") |> 
    cads_mk_request() |> 
    req_body_json(
      list(corpus_id = corpus.id, 
           items = lapply(items, function(x) list(p = p.att, surface = x)))
    ) |>
    req_method("PUT") |> 
    cads_perform_request()
}

## discourseme description breakdown
cads_discourseme_breakdown <- function(discourseme.id, description.id, p.att = "lemma"){
  str_interp("mmda/discourseme/${discourseme.id}/description/${description.id}/breakdown") |> 
    cads_mk_request() |> 
    req_url_query(p = p.att) |> 
    cads_perform_request()
}

## discourseme description similar
# TODO implement server-side min.freq
cads_discourseme_similar <- function(discourseme.id, description.id, breakdown.id, p.att = "lemma", number = 1000, min.freq = 10){
  str_interp("mmda/discourseme/${discourseme.id}/description/${description.id}/breakdown/${breakdown.id}/similar") |>
    cads_mk_request() |> 
    req_url_query(p = p.att, number = number, min_freq = min.freq) |> 
    cads_perform_request()
}

cads_discourseme_meta <- function(discourseme.id, description.id, level = "text", key = "date", p = "lemma", time.interval = "month", page.size = 1000){
  str_interp("mmda/discourseme/${discourseme.id}/description/${description.id}/meta") |> 
    cads_mk_request() |> 
    req_url_query(level = level, key = key, p = p, time_interval = time.interval, page_size = page.size) |> 
    cads_perform_request()
}


# CONSTELLATIONS ####

## list constellations
cads_list_constellations <- function () {
  str_interp("mmda/constellation") |>
    cads_mk_request() |>
    cads_perform_request() |>
    tibble()
}

## create constellation
cads_create_constellation <- function(name, discourseme.ids) {
  str_interp("mmda/constellation/") |> 
    cads_mk_request() |> 
    req_body_json(list(discourseme_ids = discourseme.ids, name = name)) |> 
    cads_perform_request()
}

## list discoursemes in constellation
cads_list_constellation_discoursemes <- function(constellation.id) {
  str_interp("mmda/constellation/${constellation.id}") |> 
    cads_mk_request() |> 
    cads_perform_request() |> 
    extract2("discoursemes") |> 
    tibble()
}

## create constellation description
cads_create_constellation_description <- function(constellation.id, s, corpus.id = .cads.cid, subcorpus.id = NULL){
  # TODO check NULL values: doesn't seem to work
  str_interp("mmda/constellation/${constellation.id}/description/") |> 
    cads_mk_request() |> 
    req_body_json(list(corpus_id = corpus.id, s = s)) |> # subcorpus_id = subcorpus.id, 
    # req_dry_run()
    req_method("PUT") |> 
    cads_perform_request()
}

cads_create_constellation_description_collection <- function(constellation.id, collection.id, s, corpus.id = .cads.cid){
  str_interp("mmda/constellation/${constellation.id}/description/collection/") |> 
    cads_mk_request() |> 
    req_body_json(list(subcorpus_collection_id = collection.id, s = s)) |>
    req_method('put') |> 
    cads_perform_request()
}

## constellation collocation
cads_constellation_collocation <- function(constellation.id, constellation.description.id, focus.discourseme.id, p, window, semmap.id = NULL){
  str_interp("mmda/constellation/${constellation.id}/description/${constellation.description.id}/collocation/") |> 
    cads_mk_request() |> 
    req_method("PUT") |> 
    req_body_json(list(focus_discourseme_id = focus.discourseme.id, p = p, window = window, semantic_map_id = semmap.id)) |> 
    cads_perform_request()
}

## constellation collocation map
cads_constellation_collocation_map <- function(constellation.id, constellation.description.id, collocation.id,
                                               page.number = 1, page.size = 50, sort.by = "conservative_log_ratio"){
  str_interp("mmda/constellation/${constellation.id}/description/${constellation.description.id}/collocation/${collocation.id}/map") |>
    cads_mk_request() |> 
    req_url_query(page_number = page.number, page_size = page.size, sort_by = sort.by, sort_order = "descending") |> 
    cads_perform_request()
}

cads_list_constellation_description <- function(constellation.id){
  str_interp("mmda/constellation/${constellation.id}/description/") |> 
    cads_mk_request() |> 
    cads_perform_request()
}

cads_list_constellation_collocation <- function(constellation.id, description.id){
  str_interp("mmda/constellation/${constellation.id}/description/${description.id}/collocation/") |> 
    cads_mk_request() |> 
    cads_perform_request()
}

cads_constellation_concordance <- function(constellation.id, description.id, 
                                           focus.discourseme.id, filter.discourseme.ids = c(), filter.item = NULL){
  str_interp("mmda/constellation/${constellation.id}/description/${description.id}/concordance/") |> 
    cads_mk_request() |> 
    req_url_query(focus_discourseme_id = focus.discourseme.id,
                  filter_discourseme_ids = filter.discourseme.ids, filter_item = filter.item,
                  subcorpus_id = subcorpus.id) |> 
    cads_perform_request()
}


cads_constellation_add_discourseme <- function(constellation.id, constellation.description.id, discourseme, discourseme.name, p = "lemma"){
  # discourseme: tibble with column "item"
  
  template_data <- discourseme |>
    rename(surface = item) |>
    mutate(p = p) |> 
    select(p, surface) |> 
    nest(template = c(p, surface)) |> 
    pull(template) |> 
    extract2(1)
  
  body <- list(
    name = discourseme.name,
    template = template_data
  )
  
  str_interp("mmda/constellation/${constellation.id}/description/${constellation.description.id}/discourseme-description") |>
    cads_mk_request() |> 
    req_method('PUT') |> 
    req_body_json(body) |>
    cads_perform_request()
  
}

cads_constellation_add_discoursemes <- function(constellation.id, constellation.description.id, discoursemes){
  # discoursemes: tibble with columns "item" and "discourseme"
  discoursemes |> 
    select(item, discourseme) %>%
    filter(complete.cases(.)) |> 
    group_by(discourseme) |> 
    group_walk(~ {
      print(.y)
      resp <- cads_constellation_add_discourseme(constellation.id, constellation.description.id, .x, .y$discourseme)
      print(resp)
    })
}

cads_constellation_associations <- function(constellation.d, constellation.description.id){
  str_interp("mmda/constellation/${constellation.id}/description/${constellation.description.id}/associations") |>
    cads_mk_request() |> 
    cads_perform_request()
}

cads_constellation_ufa <- function(constellation.id, collection.descriptions.id, focus.id, p = "lemma"){
  str_interp("mmda/constellation/${constellation.id}/description/collection/${collection.descriptions.id}/ufa") |>
    cads_mk_request() |> 
    req_body_json(list(focus_discourseme_id = focus.id, p = p)) |>
    req_method('put') |> 
    cads_perform_request()
}
