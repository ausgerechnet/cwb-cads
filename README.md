# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 

- implemented in Python/APIFlask
  + JWT authorization
  + interactive OpenAPI documentation at [cwb-cads/docs](https://corpora.linguistik.uni-erlangen.de/cwb-cads/docs)

- uses cwb-ccc for connecting to the CWB
  + CWB must be installed and corpora must be encoded via cwb-encode
  + meta data can be stored separately or be parsed from s-attributes

- MMDA backend available via [cwb-cads/mmda/](https://corpora.linguistik.uni-erlangen.de/cwb-cads/mmda/)
  + dedicated to old vue.js frontend

## Development

```
. venv/bin/activate
export CWB_CADS_CONFIG=cfg.DevConfig
```

### CLI commands

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
  flask --app cads discourseme import --path_in "tests/discoursemes/russland.tsv"
  flask --app cads discourseme export --path_out "discoursemes.tsv"
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
- [x] meta management
- [ ] speed up supcorpus queries
- [ ] subcorpus keyword analyses
- [ ] directed collocation analyses
- [ ] anchored queries
- [ ] meta distribution
- [ ] topographic maps
