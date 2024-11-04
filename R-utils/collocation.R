library(tidyverse)
library(magrittr)
library(ggrepel)


#' Align items and scores
#' 
#' @param scores scores as provided by cwb-cads (items$scores / items$raw_scores / discoursemes$global_scores)
#' @param items corresponding items
#' @returns tibble of items and scores
items.scores.formatter <- function(scores, items){
  scores |> 
    bind_rows(.id = "item") |> 
    pivot_wider(names_from = measure, values_from = score) |> 
    mutate(item = items)
}

#' Align ids and scores
#' 
#' @param scores scores as provided by cwb-cads (discoursemes$item_scores, discoursemes$unigram_item_scores)
#' @param ids discourseme ids
#' @returns tibble of ids, items, and scores
discoursemes.scores.formatter <- function(scores, ids){
  if (length(scores) != length(ids)){
    stop("length mismatch")
  }
  out <- tibble()
  for (i in 1:length(scores)){
    loc.items <- scores[[i]] |> extract2("item")
    loc.scores <- scores[[i]] |> extract2("scores")
    sc <- items.scores.formatter(loc.scores, loc.items) |> mutate(discourseme_id = ids[i])
    out <- rbind(out, sc)
  }
  return(out)
}

#' Create table of collocation profile including all discourseme scores
#' 
#' @param collocation.items collocation object as returned by cwb-cads
#' @returns a flat tibble with all scores
collocation.map <- function(collocation.items){
  
  coordinates <- collocation.items |> 
    extract2("coordinates") |> 
    distinct()
  discoursemes.coordinates <- collocation.items |> 
    extract2("discourseme_coordinates") |> 
    distinct()
  
  items.ids <- collocation.items |> 
    extract2("items") |>
    extract2("item")
  items.scores <- collocation.items |> 
    extract2("items") |> 
    extract2("scores")
  items.raw.scores <- collocation.items |>
    extract2("items") |>
    extract2("raw_scores")
  
  discoursemes.ids <- collocation.items |> 
    extract2("discourseme_scores") |> 
    extract2("discourseme_id")
  discoursemes.global.scores <- collocation.items |> 
    extract2("discourseme_scores") |> 
    extract2("global_scores")
  
  discoursemes.items.scores <- collocation.items |> 
    extract2("discourseme_scores") |> 
    extract2("item_scores")
  discoursemes.unigram.items.scores <- collocation.items |> 
    extract2("discourseme_scores") |> 
    extract2("unigram_item_scores")
  
  # actual data
  items.scores <- items.scores.formatter(items.scores, items.ids)
  items.raw.scores <- items.scores.formatter(items.raw.scores, items.ids)
  discoursemes.global.scores <- items.scores.formatter(discoursemes.global.scores, discoursemes.ids)
  discoursemes.items.scores <- discoursemes.scores.formatter(discoursemes.items.scores, discoursemes.ids)
  discoursemes.unigram.items.scores <- discoursemes.scores.formatter(discoursemes.unigram.items.scores, discoursemes.ids)
  
  # create maps
  items.map <- items.scores |> 
    # filter(! item %in% (discoursemes.unigram.items.scores |> pull(item))) |> 
    left_join(coordinates, by = "item") |> 
    mutate(discourseme_id = NA) |> 
    mutate(source = "items")
  
  discoursemes.items.map <- discoursemes.items.scores |> 
    left_join(coordinates, by = "item", relationship = "many-to-many") |> 
    mutate(source = "discoursemes_items")
  
  discoursemes.unigram.items.map <- discoursemes.unigram.items.scores |> 
    left_join(coordinates, by = "item", relationship = "many-to-many") |> 
    mutate(source = "discoursemes_unigram_items")
  
  discoursemes.global.map <- discoursemes.global.scores |> 
    left_join(discoursemes.coordinates, by = "discourseme_id", relationship = "many-to-many") |> 
    mutate(item = NA, source = "discoursemes")
  
  # combine
  map <- bind_rows(
    items.map, 
    discoursemes.global.map,
    discoursemes.items.map,
    discoursemes.unigram.items.map
  )
  
  return(map)
}
