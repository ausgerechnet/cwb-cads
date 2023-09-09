# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 

- implemented in Python/APIFlask

- interactive OpenAPI documentation at cwb-cads/docs

- MMDA backend available via cwb-cads/mmda/
  + JWT authorization
  + dedicated to old vue.js frontend

- uses cwb-ccc for connecting to the CWB
  + CWB must be installed
  + corpora must be imported via cwb-encode
  + no further corpus installation needed (TODO: creating s-att tables)


## development

## serve via Apache2 in production
- install `mod_wsgi_express` in virtual environment
  ```
  . venv/bin/activate && pip install mod_wsgi_express
  ```
- add the following to `/etc/apache2/sites-enabled/vhost-corpora-le-ssl.conf`:
  ```
  <Virtualhost *:443>
  
	  ...
	  

	  WSGIDaemonProcess mmda user=www-data group=www-data threads=4 python-home=/data/Philipp/cwb-cads/venv
	  WSGIScriptAlias /cwb-cads /data/Philipp/cwb-cads/cwb-cads.wsgi
	  WSGIPassAuthorization on
	  
	  <Directory /data/Philipp/cwb-cads/>
		WSGIProcessGroup mmda
		WSGIApplicationGroup %{GLOBAL}
		Order deny,allow
		Require all granted
	  </Directory>
	
	  ...
	  
  </Virtualhost>
  ```

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
