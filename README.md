# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 

- implemented in Python/APIFlask
  + JWT authorisation
  + interactive OpenAPI documentation at [cwb-cads/docs](https://corpora.linguistik.uni-erlangen.de/cwb-cads/docs)

- uses [cwb-ccc](https://github.com/ausgerechnet/cwb-ccc) for connecting to CWB
  + CWB must be installed and corpora must be imported via cwb-encode
  + meta data can be stored separately or be parsed from s-attributes

- this is a legacy version serving [MMDA v1](https://corpora.linguistik.uni-erlangen.de/mmda) (implemented in vue.js)

For further details, see the [main](https://github.com/ausgerechnet/cwb-cads) branch.
