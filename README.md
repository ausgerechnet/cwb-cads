# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 

- implemented in Python/APIFlask
  + JWT authorization
  + interactive OpenAPI documentation at [cwb-cads/docs](https://corpora.linguistik.uni-erlangen.de/cwb-cads/docs)

- uses cwb-ccc for connecting to the CWB
  + CWB must be installed and corpora must be encoded via cwb-encode
  + meta data can be stored separately or be parsed from s-attributes

## Development

- environment
  ```
  . venv/bin/activate
  export CWB_CADS_CONFIG=cfg.DevConfig
  ```

## CLI commands

- database init
  ```
  flask --app cads database init
  ```

- corpus management
  ```
  flask --app cads corpus import
  flask --app cads corpus subcorpora "GERMAPARL-1949-2021" "../thesis/ccc-analyses/case-studies/norm-rechts/subcorpora-*.tsv"
  flask --app cads corpus read-meta GERMAPARL-1949-2021 ../thesis/ccc-analyses/meta-data/germaparl-speaker-nodes.tsv.gz
  ```
  
- discourseme management
  ```
  flask --app cads discourseme import --path_in "tests/discoursemes/climate-change.tsv"
  flask --app cads discourseme export --path_out "exported-discoursemes.tsv"
  ```

## Features
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
- [ ] anchored queries
- [ ] topographic maps

## TODO
- [x] speed up deleting queries
- [x] extend tests
- [x] meta from s-att
- [x] more than one filter discourseme → second-order collocation
- [ ] make sure PUT runs idempotently
- [ ] consistencise trailing slashes
- [ ] speed up supcorpus queries
- [ ] directed collocation analyses
- [ ] constellation/collocation: return one object with items categorised to discoursemes
- [ ] click.echo instead of logging for CLI commands
- [ ] race conditions gdbm (spheroscophe)
- [ ] corpora settings
- [ ] stop words (language specific / user-defined) / POS filtering
- [ ] semmap: function for adding items to the topic discourseme
  + if one realises one of the collocates should actually be part of the topic discourseme,
    there should be a way to directly update the topic discourseme from within the semantic cloud
- [ ] projects
- [ ] quantitative analyses
  + how many items have been categorized
  + how many concordance lines contain at least one of them
- [ ] UFA / steamgraph
- [ ] topic-item suggestion in analysis definition
  + existing items in the corpus should be shown to the user (by frequency) = pre-check
  + to limit memory usage
    - the list should only contain items with a frequency above X (e.g. 3 ocurrences)
    - and maybe a word-length of above Y (e.g. words longer than 3 letters)
- [ ] KWIC
  + collocation analysis: node
  + MMDA constellations: select one discourseme
  + spheroscope: select one slot (left adjusted)
    - alternatively: complete sentence / tweet

## nice to have
- Concordance: primary / secondary vs. give all → separate branch
- DiscoursemeTemplate: p + surface vs. cqp_query | two lists
- DiscoursemeTemplatePreview

## Review 2024-07-17
- [x] constellation: enforce min of one filter discourseme?
- [x] constellation: if no name → name of filter discourseme
- [ ] several queries for one discourseme?
  + duplicate queries write NULL / additional column "is\_complete (alternatively: "error", "is\_loading", etc.)" instantanteously → if so: 409

## review 2024-07-30
- [ ] improve logging
- [ ] search for item on collocation table
- [ ] formatted_score: 3 führende Stellen scores
- [ ] only return items with E11 < O11

## review 2024-08-05
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
- [ ] get DiscoursemeUnigramItems from DiscoursemeItems
- [ ] deal with empty queries
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
