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
- [ ] upload a correctly indexed germaparl (with `text_` s-attributes)

# Backend

## Bugfixes

- [ ] duplicated items in map endpoint, although they only appear once in the database [cannot reproduce]

curl 'https://corpora.linguistik.uni-erlangen.de/cwb-cads-dev/mmda/constellation/1/description/17/collocation/66/map?sort_order=descending&page_size=300&page_number=1' -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0' -H 'Accept: application/json, text/plain, */*' -H 'Accept-Language: en-US,en;q=0.5' -H 'Accept-Encoding: gzip, deflate, br, zstd' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTczODA3ODEzMCwianRpIjoiODA2ZDY1NzYtZDNiMS00ZTRjLWFlMTItYjMxNTUyNTgzM2UyIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiJ9LCJuYmYiOjE3MzgwNzgxMzAsImNzcmYiOiIxZmU4Y2MzMi1lZjgxLTRiMzQtOTQ0MC0zODhkYWU3ZDQyZWQiLCJleHAiOjE3MzgwNzk5MzB9.D9b5tFL1CbegHclrl-IxF0QYXBLmaENFKKaFMjwg0cU' -H 'Origin: http://localhost:3000' -H 'DNT: 1' -H 'Connection: keep-alive' -H 'Referer: http://localhost:3000/' -H 'Sec-Fetch-Dest: empty' -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: cross-site' -H 'Priority: u=0' -H 'Pragma: no-cache' -H 'Cache-Control: no-cache'

- [ ] filter concordance lnes such that all discoursemes are included [already implemented]

- [ ] empty base items

curl 'https://corpora.linguistik.uni-erlangen.de/cwb-cads-dev/mmda/constellation/1/description/1/collocation/' -X PUT -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0' -H 'Accept: application/json, text/plain, */*' -H 'Accept-Language: en-US,en;q=0.5' -H 'Accept-Encoding: gzip, deflate, br, zstd' -H 'Content-Type: application/json' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTczNDUzMDIyNywianRpIjoiYTBmOTVkMjEtYWRiMC00NDU1LWEwNzEtMjkwYzkwOGI3NjkyIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiJ9LCJuYmYiOjE3MzQ1MzAyMjcsImNzcmYiOiJhNGM1NjRjOS0wMzk3LTQ1YzctOTNhZi1jNTA2ZTA3YmZlMzAiLCJleHAiOjE3MzQ1MzIwMjd9.Xum6QpGBaOgnFnJ_Q1hqgjfZEc_hcfKZAH0tb2eX7p4' -H 'Origin: http://localhost:3000' -H 'DNT: 1' -H 'Connection: keep-alive' -H 'Referer: http://localhost:3000/' -H 'Sec-Fetch-Dest: empty' -H 'Sec-Fetch-Mode: cors' -H 'Sec-Fetch-Site: cross-site' -H 'Pragma: no-cache' -H 'Cache-Control: no-cache' --data-raw '{"filter_discourseme_ids":[],"filter_item_p_att":"lemma","filter_overlap":"partial","focus_discourseme_id":2,"include_negative":false,"marginals":"local","p":"lemma","s_break":"s","semantic_map_id":null,"semantic_map_init":true,"window":10}'


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
- [ ] GERMAPARL1386 on dev server
- [ ] usage fluctuation analysis
  + provide endpoint and example
- [ ] quantitative feedback for collocation / keyword discourseme categorisation
  + how many items have been categorised?
  + how many concordance lines contain at least one of them?
- [ ] anchored queries [spheroscope]


## Minor features and improvements

### Performance
- [x] speed up deleting queries
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
- [x] additional variable: scale to [0,1]

- [ ] search for item on collocation table

### Semantic Map
- [x] semantic map: normalise coordinates to [-1, 1]^2
- [x] consolidated score table at constellation / collocation / items
- [ ] discourseme colouring

### Default (corpora) settings
- [ ] endpoint for displaying and setting default corpora settings

### Projects
- [ ] projects for discoursemes / constellations

### Meta data
- [x] meta from s-att
- [ ] auto-init / show which is possible + if initialised?

### Tests
- [ ] different constellations on development server
- [ ] meta data creation
- [ ] subcorpus creation

### Logging
- [x] improve logging: do not log cwb-ccc

## Notes
- [ ] concordancing
  + collocation analysis: KWIC on node
  + MMDA constellations: KWIC on one selected discourseme
  + [spheroscope]: KWIC on one selected slot (left adjusted)
    - alternatively: complete sentence / tweet

- [x] constellation/collocation: return one object with items categorised to discoursemes
- [ ] post collocation semantic-map mit json

- [ ] topic-item suggestion in analysis definition
  + existing items in the corpus should be shown to the user (by frequency) = pre-check
  + to limit memory usage
    - the list should only contain items with a frequency above X (e.g. 3 ocurrences)
    - and maybe a word-length of above Y (e.g. words longer than 3 letters)

- [ ] auto-associate discoursemes

- [ ] empty discourseme descriptions possible → constellations with empty discoursemes

- [x] create discourseme in constellation description

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
- [ ] PUT for constellation / keyword analyses
- [ ] PUT for queries (creation, collocation, etc.)?
- [ ] JWT in cookies


# OS / 12-2024

- wie können discourseme description items queries sein?
- Atomkraft entfernen, wenn Atomkraft|Energie in Template → Folgefehler?
- doppelte Diskursem-Items nach Nutzung des PUT Endpunkts
