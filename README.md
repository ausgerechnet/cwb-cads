# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 

- implemented in Python/APIFlask
  + interactive OpenAPI documentation at [cwb-cads/docs](https://corpora.linguistik.uni-erlangen.de/cwb-cads/docs)

- uses cwb-ccc for connecting to the CWB
  + CWB must be installed
  + corpora must be imported via cwb-encode
  + no further corpus installation needed (TODO: creating s-att tables)

- MMDA backend available via [cwb-cads/mmda/](https://corpora.linguistik.uni-erlangen.de/cwb-cads/mmda/)
  + JWT authorization
  + dedicated to old vue.js frontend

## Development

- use makefile for testing and development
  ```
  make install
  make init
  make run
  make test
  ```

## Features

### CADS features
- [x] query
- [x] breakdown
- [x] concordance
- [x] collocation analysis
- [x] keyword analysis
- [x] subcorpus creation
- [ ] meta distribution
- [ ] anchored queries

## MMDA features
- discoursemes
  + creation 
  + query / collocation analysis
  + meta distribution
- discourseme constellations
  + pairwise discourseme associations
  + visualisation
  + definition via optional and obligatory discoursemes
  + meta distribution
  + secondary collocates
- semantic map
  + automatic visualisation of n-best lists (keywords, collocates)
  + manual arrangement
  + projection (including new items in created map)
  + interactive drag & drop for discourseme creation

# current issues

bugfix
- quick-conc without s-att
- deleting discourseme → deleting collocations where discourseme is filter
- no results → network error; but empty discourseme is added
- few results → no collocates table → netwerk error

performance:
- quick-conc ain't quick enough
- create all window counts separately
- regenerate: delete all collocation items, create for given window size

semantic map
- discourseme positions: automatically move items towards center of manual positions
- new items: move away from center

code sanity
- move second order collocation to ccc_collocates

test
- top-level methods only

# test cases

## collocation analysis workflow

create collocation (constellation: one filter discourseme, no highlight discoursemes)

- get breakdown
- get collocation
- get concordance

create discourseme

- create discourseme from two items
- add discourseme to highlight discoursemes

- get concordance lines

delete discourseme

- delete discourseme from highlight discoursemes

change discourseme

- delete item from discourseme
- add item to discourseme
