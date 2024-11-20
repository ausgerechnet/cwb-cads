library(tidyverse)
library(lubridate)
library(httr2)
library(jsonlite)
source("concordance.R")
source("collocation.R")

url_api <- "https://corpora.linguistik.uni-erlangen.de/cwb-cads-dev"

access.token <- str_interp("${url_api}/user/login") |> 
  request() |> 
  req_method("POST") |> 
  req_body_form(password = 'admin-mmda-ccl', username = 'admin') |> 
  req_perform() |>
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON() |>
  magrittr::extract2("access_token")

corpora <- str_interp("${url_api}/corpus/") |> 
  request() |> 
  req_auth_bearer_token(access.token) |> 
  req_perform() |> 
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON() |> 
  tibble()

germaparl.id <- corpora |> filter(cwb_id == "GERMAPARL_BETA_LP19") |> pull(id)

discoursemes <- str_interp("${url_api}/mmda/discourseme/") |> 
  request() |> 
  req_auth_bearer_token(access.token) |> 
  req_perform() |> 
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON() |> 
  tibble()

disc.climate.change.id <- discoursemes |> filter(name == "Klimawandel") |> pull(id)

const.cc <- str_interp("${url_api}/mmda/constellation/") |> 
  request() |> 
  req_body_json(list(discourseme_ids = disc.cc.ids)) |> 
  req_auth_bearer_token(access.token) |> 
  req_perform() |> 
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON()

const.cc.id <- const.cc |> magrittr::extract2("id")

const.cc.description <- str_interp("${url_api}/mmda/constellation/${const.cc.id}/description/") |>
  request() |>
  req_body_json(list(corpus_id = germaparl.id)) |>
  req_auth_bearer_token(access.token) |>
  req_perform() |>
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON()

const.cc.description.id <- const.cc.description |> magrittr::extract2("id")

concordance <- str_interp("${url_api}/mmda/constellation/${const.cc.id}/description/${const.cc.description.id}/concordance") |> 
  request() |> 
  req_url_query(focus_discourseme_id = disc.climate.change.id, sort_order = "ascending", sort_by_offset = 0, sort_by_p_att = "lemma", ilter_discourseme_ids = c(disc.nuclear.energy.id)) |> 
  req_auth_bearer_token(access.token) |> 
  req_perform() |> 
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON()

concordance

str_interp("${url_api}/mmda/constellation/1/description/2/collocation/") |> 
  request() |> 
  req_method('PUT') |> 
  req_auth_bearer_token(access.token) |> 
  req_body_json(list(
    filter_discourseme_ids = list(),
    filter_item_p_att = "lemma",
    filter_overlap = "partial",
    focus_discourseme_id = 5,
    include_negative = F,
    marginals = "local",
    p = "lemma",
    s_break = "s",
    semantic_map_id = NULL,
    semantic_map_init = T,
    window = 10
  )) |> 
  req_perform() |> 
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON()

str_interp("${url_api}/mmda/constellation/1/description/2/concordance/") |> 
  request() |> 
  req_auth_bearer_token(access.token) |> 
  req_url_query(
    focus_discourseme_id = 5,
    window = 10,
    primary = "word",
    secondary = "lemma",
    page_size = 5,
    page_number = 1,
    sort_order = "random"
  ) |> 
  req_perform() |> 
  magrittr::extract2("body") |>
  rawToChar() |> fromJSON()


