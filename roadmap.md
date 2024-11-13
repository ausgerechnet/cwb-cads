# Frontend

## Bugfixes

- [ ] concordance KWIC view doesn't show MWUs as keywords, only first token
- [ ] concordance sorting doesn't work as expected
- [ ] I think there's a general confusion between the items in the discourseme description (which are CQP queries, or p/surface pairs) and the items on the (unigram) breakdown -- which should be highlighted in the semantic map.
- [x] collocation items: after selecting a corpus and a focus discourseme, the frontend asks for collocation analyses via `GET /mmda/constellation/<constellation_id>/description/<description_id>/collocation/`, but then does not use `GET /mmda/constellation/<constellation_id>/description/<description_id>/collocation/<id>/items` but `GET /collocation/<id>/items` instead. this endpoint does return the same items, but no discourseme scores (or coordinates).

## Features

- [ ] semantic map: mini map
- [ ] semantic map: discourseme names should be visualised in the semantic map. the correct endpoint (see above) returns corresponding coordinates. when selecting a discourseme by clicking on it, their individual items should be displayed on the side.
- [ ] semantic map: moving items (and discoursemes) on the map should be possible.
- [ ] semantic map: filtering concordance lines via selecting an item or a discourseme should be possible via clicking (as above).
- [ ] semantic map: there should be the possibility to hide items that belong to the unigram breakdown of a discourseme (especially the focus discourseme).
- [ ] adding items to the topic discourseme from semantic map in collocation analyses → pop-up warning / complete re-load?
- [x] constellation view: collocation parameters (*window size*, *context break*, *secondary*, *sort by*, *sort order*) should be separated from concordance parameters (*sort by offset*, *sort order*, *primary*). note that collocation parameters are always also considered in concordancing.
- [x] constellation view: filter item (and filter discourseme) should be accessible via clicking. this should directly filter concordance lines and provide the option to start a "secondary" collocation analysis.
- [ ] constellation association view: associations between discoursemes in a constellation (`GET /mmda/constellation/<id>/description/<description_id>/associations`) should be visualised (triangular matrix per measure; force-directed layout)

# Misc

- [ ] UI with modes: CADS, MMDA, spheroscope
- [ ] overlapping segmentation annotation (Frontend / LaTeX / Quarto)
- [ ] update backend manuals
- [ ] create vignette


# Backend

## Major features
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
- [x] pairwise associations of discoursemes
- [ ] usage fluctuation analysis
- [ ] quantitative feedback for collocation / keyword discourseme categorisation
  + how many items have been categorised?
  + how many concordance lines contain at least one of them
- [ ] anchored queries [spheroscope]


## Minor features

### Performance
- [ ] speed up constellation concordance retrieval (discourseme range retrieval / sorting)
- [ ] speed up supcorpus queries
- [ ] speed up collocation/items: do not return discourseme scores?

### Multi-user
- [ ] several queries for one discourseme?
  + duplicate queries write NULL / additional column "is\_complete (alternatively: "error", "is\_loading", etc.)" instantanteously → if so: 409
- [ ] user: discoursemes / constellations

### Scores
- [x] remove items of focus discourseme in collocation analyses
- [x] do not return items with negative evidence

- [ ] indicate relevance (relevant, irrelevant)
- [ ] sigmoid / tangens scaling vs. linear scaling
- [ ] formatted with three leading digits
- [ ] resource: translate names of AMs
- [ ] additional variable: scale to [0,1]

- [ ] search for item on collocation table

### Semantic Map
- [x] semantic map: normalise coordinates to [-1, 1]^2

### Default (corpora) settings
- [ ] endpoint for displaying and setting default corpora settings

### Projects
- [ ] projects for discoursemes / constellations

### Meta data
- [x] meta from s-att
- [ ] auto-init / show which is possible + if initialised?

### Tests
- [x] speed up deleting queries
- [x] extend tests
- [ ] example meta data creation
- [ ] example subcorpus creation

### Logging
- [ ] improve logging: do not log cwb-ccc

## Notes
- [ ] concordancing
  + collocation analysis: KWIC on node
  + MMDA constellations: KWIC on one selected discourseme
  + [spheroscope]: KWIC on one selected slot (left adjusted)
    - alternatively: complete sentence / tweet

- [ ] constellation/collocation: return one object with items categorised to discoursemes
- [ ] post collocation semantic-map mit json

- [ ] topic-item suggestion in analysis definition
  + existing items in the corpus should be shown to the user (by frequency) = pre-check
  + to limit memory usage
    - the list should only contain items with a frequency above X (e.g. 3 ocurrences)
    - and maybe a word-length of above Y (e.g. words longer than 3 letters)

- [ ] auto-associate discoursemes

- [ ] GET `/mmda/constellation/{id}/description/{description_id}/collocation/` doesn't yield all info

- [ ] empty discourseme descriptions possible → constellations with empty discoursemes

- [ ] create discourseme in constellation description

- [ ] collocation → get query\_id + filter\_sequence

- [ ] subcorpus: number spans / tokens 0 ?? text / faction

- [ ] rm or rename query / concordance / discourseme ranges

- [ ] queries vs surface items: save queries alongside description

- [ ] discourseme visualisation in collocation analyses

these discourseme unigram item ones can easily be removed from the map:
- word list on analysis layer
- MWUs on analysis layer

these cannot be easily removed:
- queries, e.g. [lemma="item" & pos="P"]
- word lists on sth. else than analysis layer
- MWUs on sth. else than analysis layer

## nice to have
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
