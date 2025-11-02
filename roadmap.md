# Frontend beta test 2025-10-22

## general / nice to have
- create/edit of all resources: 
  + pop-up like "start discourseme analysis"
- semantic map:
  + there should be the possibility to show items that belong to the breakdown of a discourseme in the map
  + adding items to the focus discourseme from semantic map in collocation analyses → pop-up warning / complete re-load
- concordances:
  + overlapping segmentation annotation

## corpora
- make filterable

### corpus
- list corresponding subcorpora and add button for "create subcorpus" (like collections)
- rename "partition" → "subcorpus collection"
- make name, language, register, description editable
- meta frequencies: (works in subcorpus building view)
  + sort alphabetically (by "bin") vs. sort by size
  + select spans → sorted by tokens size

### subcorpora
- move into "corpus" view (like subcorpus collectons)
- make table filterable
- hide / filter collections / display collection ID or name (issue #12)
- clicking on "view subcorpus" → ID "0"

#### subcorpus collection
- extend creation (needs backend update, issue #12)
  + also for categorical variables
  + also for subsets / overlapping windows etc.

#### subcorpus
- make name, description editable
- show meta frequencies
- cannot delete?

## queries
- make filterable
- display subcorpus (query.subcorpus_id, query.subcorpus_name)
- display Context Break (query.s)
- display number of matches (query.number_matches)
- display description (query.description)
- display words on word lists (needs backend update, issue #15)

### query
- do not start collocation analysis by itself
- display details (cf. above), incl. subcorpus
- make description editable

#### item table
- should have a title
- display rank
- flip up/down arrow
- overall nice item table, unify with constellation collocation table

#### semantic map
- include cut-off, parameters (unify with constellations)

## keyword analysis
- concordance lines, semantic map, item table as query/collocation

### semantic map
- BUG: clicking on an item throws user back to the item table view (for loading concordance lines)

## discoursemes
- make filterable

### discourseme
- make items editable

## constellations
- BUG: create new constellation → add successfully → empty panel (visible after refresh works)

### constellation
- [x] order: Breakdown > Associations > Keyword Analysis > Collocation Analysis > UFA
- [ ] lock in settings when switching tabs

#### breakdown (parameters: corpus, context break, analysis layer)
- should also include "Context Break" to be selected by user
- BUG: doesn't show any data; should call
/mmda/constellation/{constellation_id}/description/{description_id}/breakdown/

#### associations (parameters: corpus, context break)
- should also include "Context Break" to be selected by user
- BUG: doesn't show any data; should call
/mmda/constellation/{constellation_id}/description/{description_id}/associations/
  
#### keyword analysis (parameters: corpus, context break, analysis layer, reference corpus, reference analysis layer)
- BUG: still calls endpoint before selecting context break

##### concordance lines
- only works with focus discourseme (should also work with filter item only)

#### collocation analysis (parameters: corpus, context break, analysis layer, focus discourseme)
- show if an item belongs to a discourseme in collocation table
- possibility to remove filter discourseme in 2nd order analysis

##### semantic map
- opening / closing concordance lines throws user back to item table

##### concordance lines
- auto-select (and lock in) focus discourseme (in "filter discoursemes")

#### UFA
- should also include "Context Break" to be selected by user
- BUG: cannot select focus discourseme:
```
Error ["constellation-description",{"constellationId":1,"corpusId":2,"matchStrategy":"longest","s":"corpus_name","subcorpusId":null}] data is undefined
```

# Backend notes

- [ ] backend manuals
- [ ] create vignette

## Bugs
- [ ] too many query matches: 
  + 200 + message: display random selection (and mention number of actual lines)

## Features
- [ ] quantitative feedback for collocation / keyword discourseme categorisation
  + how many items have been categorised?
  + how many concordance lines contain at least one of them?
- [ ] anchored queries [spheroscope]
- [ ] endpoint for displaying and setting (default) corpora settings
- [ ] topic-item suggestion in analysis definition
  + existing items in the corpus should be shown to the user (by frequency) = pre-check
  + to limit memory usage
    - the list should only contain items with a frequency above X (e.g. 3 ocurrences)
    - and maybe a word-length of above Y (e.g. words longer than 3 letters)
- [ ] /query/<query\_id>/meta with non-categorical level\_key

### Scores
- [ ] search for item on collocation table
- [ ] indicate relevance (relevant, irrelevant)
- [ ] sigmoid / tangens scaling vs. linear scaling
- [ ] formatted with three leading digits
- [ ] resource: translate names of AMs

### Semantic Map
- [ ] discourseme colouring

### Projects
- [ ] projects for discoursemes / constellations

### Meta data
- [ ] auto-init / show which is possible + if initialised?

## Performance
- [ ] speed up supcorpus queries
  + create subcorpus of focus context, filter for filter item only on subcorpus of focus

## Notes
- [ ] concordancing
  + collocation analysis: KWIC on node
  + MMDA constellations: KWIC on one selected discourseme
  + [spheroscope]: KWIC on one selected slot (left adjusted)
    - alternatively: complete sentence / tweet
- [ ] empty discourseme descriptions possible → constellations with empty discoursemes
- [ ] collocation → get query\_id + filter\_sequence

## nice to have
- Concordance: primary / secondary vs. give all
- DiscoursemeTemplate: p + surface vs. cqp_query | two lists
- DiscoursemeTemplatePreview
- concordance lines: sort\_by\_s\_att
- topographic maps
- consistencise trailing slashes
- directed collocation analyses
- [steamgraph](http://leebyron.com/streamgraph/)
- stop words (language specific / user-defined) / POS filtering
- race conditions gdbm [spheroscope]
- JWT in cookies
- redirect tail log to endpoint
