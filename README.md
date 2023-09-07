# cwb-cads

- a python backend for corpus-linguistic discourse analysis
  + CLI
  + OpenApi, user management (auth, history)
- uses cwb-ccc for connecting to the CWB
  + CWB must be installed
  + corpora must be imported via cwb-encode
  + no further corpus installation needed, but creating s-att tables is recommended

## standard features
- query interface
- concordancing
- breakdown (using anchor points)
- collocation
- subcorpus creation
- meta distribution
- keyword analysis

## MMDA features
- discoursemes
  + creation 
  + description
  + query
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


### components

#### keyword analysis

#### collocation analysis

#### interaction on semantic map

discoursemes → corpora → matches

corpora → discoursemes → matches


discourseme-view

POST /discourseme/?cwb_id=<cwb_id>

GET /discourseme/<id>/matches/?cwb_id=<cwb_id>
- for specified corpora: provide matches

keyword-view

collocation-view

constellation-view


POST /corpus/<id>/discourseme/

GET /matches/discoursemes/




+ discourseme creation / update

+ query creation
  + 1 item
  + 2 items
  + many items
    
PATCH discourseme/<id> 
+ discourseme update
  + include in discourseme
  + remove from discourseme



POST discourseme/corpus/<topic_id>
+ topic update = restart

GET discourseme/<id>/concordance
+ discourseme concordance

GET discourseme
