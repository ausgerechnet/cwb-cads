# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 

- implemented in Python/APIFlask
  + interactive OpenAPI documentation at [cwb-cads/docs](https://corpora.linguistik.uni-erlangen.de/cwb-cads/docs)

- uses cwb-ccc for connecting to the CWB
  + CWB must be installed
  + corpora must be imported via cwb-encode
  + no further corpus installation needed (TODO: creating s-att tables, cache frequencies)

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

- [x] query
- [x] breakdown
- [x] concordance
- [x] collocation analysis
- [x] keyword analysis
- [x] subcorpus creation
- [x] show subcorpus in collocation analysis
- [x] execute queries and breakdowns automatically
- [x] export discoursemes
- [x] repair constellations
- [x] speed up concordance highlighting
- [x] coordiantes of elements within discoursemes
- [x] subcorpus is corpus with matches
- [x] discourseme → query → breakdown → items
- [ ] speed up supcorpus queries
- [ ] subcorpus keyword analyses
- [ ] directed collocation analyses
- [ ] anchored queries
- [ ] meta management
  - save attributes in SQL (id -- level -- cwb_id -- match -- matchend)
  - save annotation in SQL (id -- key -- value)
- [ ] meta distribution
- [ ] topographic maps
