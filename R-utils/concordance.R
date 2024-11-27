library(tidyverse)
library(magrittr)
library(xtable)


.latex.colours <- c(
  "red",
  "green",
  "blue",
  "cyan",
  "magenta",
  "yellow",
  "black",
  "gray",
  "white",
  "darkgray",
  "lightgray",
  "brown",
  "lime",
  "olive",
  "orange",
  "pink",
  "purple",
  "teal",
  "violet"
)

.disc.colours <- tibble(
  discourseme_id = 1:length(.latex.colours),
  colour = .latex.colours
)

#' Create LaTeX string with ranges highlighted by (nested) colour boxes
#' 
#' @param line the concordance line
#' @param ranges ranges to be highlighted
#' @returns a LaTeX string
latex_line_colours <- function(line, ranges) {
  
  # ensure line has correct columns
  if(!all(c('primary', 'cpos') %in% colnames(line))) {
    stop("Dataframe must have 'primary' and 'cpos' columns")
  }
  
  # ensure ranges have correct columns
  if(!all(c('start', 'end', 'colour') %in% colnames(ranges))) {
    stop("Ranges must have 'start', 'end', and 'colour' columns")
  }
  
  # start building the LaTeX string
  latex_string <- ""
  
  # define function to get all range colours for overlapping ranges
  get_all_range_colours <- function(pos, ranges) {
    if (nrow(ranges) == 0){
      return(NULL)
    }
    colours <- c()
    for (i in 1:nrow(ranges)) {
      if (pos >= ranges$start[i] && pos <= ranges$end[i]) {
        colours <- c(colours, ranges$colour[i])
      }
    }
    return(colours)  # Return vector of colours
  }
  
  # iterate through tokens and wrap those in ranges with colour
  for (i in 1:nrow(line)) {

    token <- line$primary[i]
    pos <- line$cpos[i]
    
    # get the colors for the token's position (all overlapping ranges)
    colours <- get_all_range_colours(pos, ranges)
    
    # wrap token in colour boxes (nested if there are multiple overlapping ranges)
    if (length(colours) > 0) {
      for (colour in colours) {
        token <- paste0("\\colorbox{", colour, "}{", token, "}")
      }
    }
    
    # append
    latex_string <- paste0(latex_string, token, " ")
  }
  
  return(latex_string)
}

#' Create LaTeX string of one concordance line with ranges highlighted by (nested) colour boxes
#' 
#' @param concordance concordance object as returned by cwb-cads
#' @param disc.colours dataframe which maps from discourseme_id to colour
#' @param number which concordance line to create
#' @returns line `number` formatted in LaTeX
latex.line <- function(concordance, number = 1, disc.colours = .disc.colours){
  conc.lines <- concordance |> extract2("lines")
  conc.line <- conc.lines |> slice(number)
  disc.ranges <- conc.line |> pull(discourseme_ranges) |> extract2(1)
  if (length(disc.ranges) > 0){
    disc.ranges <- disc.ranges |> left_join(disc.colours, by = "discourseme_id")
  }
  else {
    disc.ranges <- tibble(start = numeric(), end = numeric(), colour = numeric())
  }
  tokens <- conc.line |> pull(tokens) |> extract2(1)
  latex_line_colours(tokens, disc.ranges)
}

#' Create KWIC table of concordance, including meta data (lines$structural)
#' 
#' @param concordance concordance object as returned by cwb-cads
#' @returns concordance as KWIC tibble
conc.kwic <- function(concordance, disc.colours = NULL){

  structural <- concordance |> extract2("lines") |> select(starts_with("structural")) |> extract2("structural")
  conc.lines <- concordance |> extract2("lines")

  conc.lines.df <- tibble(left = c(), node = c(), right = c(), disc_ranges = c())
  for (i in 1:nrow(conc.lines)){
    
    tokens <- conc.lines |> slice(i) |> pull(tokens) |> extract2(1)
    
    left <- tokens |> filter(offset < 0, !out_of_window)
    node <- tokens |> filter(offset == 0) |> pull(primary) |> str_flatten(" ")
    right <- tokens |> filter(offset > 0, !out_of_window)

    if (!is.null(disc.colours)){
      disc.ranges <- conc.lines |> slice(i) |> pull(discourseme_ranges) |> extract2(1) |> left_join(disc.colours, by = "discourseme_id")
      left <- latex_line_colours(tokens |> filter(offset < 0), disc.ranges)
      right <- latex_line_colours(tokens |> filter(offset > 0), disc.ranges)
    }
    else{
      left <- left |> pull(primary) |> str_flatten(" ")
      right <- right |> pull(primary) |> str_flatten(" ")
    }

    conc.lines.df <- rbind(
      conc.lines.df,
      tibble(left = left, node = node, right = right)
    )
  }

  conc.lines.df <- cbind(conc.lines.df, structural) |> tibble()
  
  return(conc.lines.df)
}

#' Create LaTeX table of concordance from KWIC tibble
#' 
#' @param conc.tbl output of conc.kwic
#' @param path.out output path (.tex)
#' @param crop how many characters to display
#' @returns 
latex.lines <- function(conc.tbl, path.out, nr.char = 100, align = "crcl", caption = "", label = "tab:"){
  crop <- as.integer(max(0, min(nr.char - max(str_length(conc.tbl$node)))) / 2)
  conc.tbl |> 
    rowwise() |> 
    mutate(
      left = str_sub(left, str_length(left) - min(crop, str_length(left)) + 1),
      right = str_sub(right, end = min(crop, min(crop, str_length(right))))
    ) |> 
    mutate(
      left = paste0("\\texttt{", left, "}"),
      node = paste0("\\texttt{", node, "}"),
      right = paste0("\\texttt{", right, "}")
    ) |> 
    xtable(align = align, caption = caption, label = label) |>
    print(file = path.out, booktabs = TRUE, size = "footnotesize", sanitize.text.function = identity)
}
