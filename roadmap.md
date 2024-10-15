# Frontend

## Bugfixes

- [ ] concordance KWIC view doesn't show MWUs as keywords, only first token
- [ ] concordance sorting doesn't work as expected
- [ ] I think there's a general confusion between the items in the discourseme description (which are CQP queries, or p/surface pairs) and the items on the (unigram) breakdown -- which should be highlighted in the semantic map.
- [ ] collocation items: after selecting a corpus and a focus discourseme, the frontend asks for collocation analyses via `GET /mmda/constellation/<constellation_id>/description/<description_id>/collocation/`, but then does not use `GET /mmda/constellation/<constellation_id>/description/<description_id>/collocation/<id>/items` but `GET /collocation/<id>/items` instead. this endpoint does return the same items, but no discourseme scores (or coordinates).

## Features

- [ ] semantic map: mini map
- [ ] semantic map: discourseme names should be visualised in the semantic map. the correct endpoint (see above) returns corresponding coordinates. when selecting a discourseme by clicking on it, their individual items should be displayed on the side.
- [ ] semantic map: moving items (and discoursemes) on the map should be possible.
- [ ] semantic map: filtering concordance lines via selecting an item or a discourseme should be possible via clicking (as above).
- [ ] semantic map: there should be the possibility to hide items that belong to the unigram breakdown of a discourseme (especially the focus discourseme).
- [ ] constellation view: collocation parameters (*window size*, *context break*, *secondary*, *sort by*, *sort order*) should be separated from concordance parameters (*sort by offset*, *sort order*, *primary*). note that collocation parameters are always also considered in concordancing.
- [ ] constellation view: filter item (and filter discourseme) should be accessible via clicking. this should directly filter concordance lines and provide the option to start a "secondary" collocation analysis.

# Misc

- [ ] overlapping segmentation annotation (LaTeX / Quarto)
- [ ] update manuals

## Backend

### Major features
- [x] query
- [x] breakdown
- [x] concordance
- [x] collocation analysis
- [x] keyword analysis
- [x] meta data management
- [x] subcorpus creation
- [x] discoursemes & constellations
- [x] semantic maps
- [x] second-order collocation analysis
- [x] meta distribution
- [ ] pairwise associations of discoursemes (triangular matrix)
- [ ] usage fluctuation analysis
- [ ] quantitative feedback for collocation / keyword discourseme categorisation
  + how many items have been categorised?
  + how many concordance lines contain at least one of them
- [ ] anchored queries [spheroscope]

### Minor features
- [ ] scores: indicate relevance (relevant, irrelevant)
- [x] scores: do not return items with negative evidence
- [ ] scores: sigmoid / tangens scaling vs. linear scaling
- [x] semantic map: normalise to [-1, 1]^2
- [x] scores / semantic map: remove items of focus discourseme in collocation analyses
- [ ] speed up constellation concordance retrieval (discourseme range retrieval / sorting)
- [ ] corpora settings
- [ ] projects for discoursemes / constellations
- [ ] semmap: function for adding items to the topic discourseme
  + if one realises one of the collocates should actually be part of the topic discourseme, there should be a way to directly update the topic discourseme from within the semantic cloud
- [ ] topic-item suggestion in analysis definition
  + existing items in the corpus should be shown to the user (by frequency) = pre-check
  + to limit memory usage
    - the list should only contain items with a frequency above X (e.g. 3 ocurrences)
    - and maybe a word-length of above Y (e.g. words longer than 3 letters)
- [ ] concordancing
  + collocation analysis: KWIC on node
  + MMDA constellations: KWIC on one selected discourseme
  + [spheroscope]: KWIC on one selected slot (left adjusted)
    - alternatively: complete sentence / tweet
- [x] speed up deleting queries
- [x] extend tests
- [x] meta from s-att
- [x] more than one filter discourseme → second-order collocation
- [ ] speed up supcorpus queries
- [ ] constellation/collocation: return one object with items categorised to discoursemes

### review 2024-07-17
- [x] constellation: enforce min of one filter discourseme?
- [x] constellation: if no name → name of filter discourseme
- [ ] several queries for one discourseme?
  + duplicate queries write NULL / additional column "is\_complete (alternatively: "error", "is\_loading", etc.)" instantanteously → if so: 409

### review 2024-07-30
- [ ] improve logging
- [ ] search for item on collocation table
- [ ] scores formatted: 3 leading digits
- [x] only return items with E11 < O11

### review 2024-08-05
- [x] wrongly indexed s-atts in corpora (e.g. GERMAPARL\_1949\_2021 on obelix)
- [x] save wordlists permanently
- [x] get keyword analyses loading time: replace `len(items)`
- [x] keyword details: target / reference (as strings)
- [x] /corpus/{id}/subcorpus/{id}
- [x] /query/ without discourseme / discourseme\_id / nqr\_cqp
- [x] remove /query/execute
- [x] breakdown rm TODO: pagination needed?
- [x] concordance / lines / id → match\_id
- [x] only return queries with NQR for now, do not return nqr\_cqp
- [x] position discoursemes on semantic map
- [x] get DiscoursemeUnigramItems from DiscoursemeItems
- [x] deal with empty queries
- [ ] meta data: auto-init / show which is possible + if initialised?
- [ ] auto-associate discoursemes
- [ ] empty discourseme descriptions possible → constellations with empty discoursemes
- [ ] create discourseme in constellation description
- [ ] user: discoursemes / constellations
- [ ] txt: translate names of AMs
- [ ] post collocation semantic-map mit json
- [ ] all outputs (required = True)?
- [ ] collocation → get query\_id + filter\_sequence
- [ ] subcorpus: number spans / tokens 0 ?? text / faction
- [ ] rm or rename query / concordance / discourseme ranges
- [ ] example meta data creation
- [ ] example subcorpus creation

### review 2024-09-03
- [ ] GET `/mmda/constellation/{id}/description/{description_id}/collocation/` doesn't yield all info

### nice to have
- Concordance: primary / secondary vs. give all
- DiscoursemeTemplate: p + surface vs. cqp_query | two lists
- DiscoursemeTemplatePreview
- [ ] concordance lines: sort\_by\_s\_att
- [ ] topographic maps
- [ ] make sure PUT runs idempotently
- [ ] consistencise trailing slashes
- [ ] directed collocation analyses
- [ ] [steamgraph](http://leebyron.com/streamgraph/)
- [ ] click.echo instead of logging for CLI commands
- [ ] stop words (language specific / user-defined) / POS filtering
- [ ] race conditions gdbm [spheroscope]
