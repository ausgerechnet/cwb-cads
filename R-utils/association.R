library(tidyverse)
library(ggraph)
library(tidygraph)

associations.map <- function(association_scores, discoursemes, measure, min.weight = 0){

  g <- association_scores |> 
    filter(node %in% discoursemes$id, candidate %in% discoursemes$id) |> 
    filter(measure == !!measure) |> 
    filter(score > 0) |> 
    select(node, candidate, score) |> 
    rename(from = node, to = candidate, weight = score) |> 
    left_join(discoursemes |> select(id, name), by = join_by(from == id)) |> mutate(from = name) |> select(- name) |> 
    left_join(discoursemes |> select(id, name), by = join_by(to == id)) |> mutate(to = name) |> select(- name)
  
  g |>
    filter(weight >= min.weight) |> 
    as_tbl_graph(directed = FALSE) |> 
    ggraph(layout = "fr") +
    geom_edge_link(aes(width = weight, alpha = .05), color = "darkgray") +
    geom_node_point() +
    geom_node_text(aes(label = name), repel = TRUE) +
    theme_void()    
}
