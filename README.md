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

- we use Apache in production

  + install Apache
    ```
    sudo apt install apache2 apache2-dev
    ```
  + install Apache mod for WSGI daemon
    ```
    sudo apt-get install python3-pip apache2 libapache2-mod-wsgi-py3
    ```

- in case you need to set up SSL:

  + enable SSL
  ```
  sudo a2enmod ssl
  systemctl restart apache2
  ```
  + create SSL certificate
  ```
  sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/apache-selfsigned.key -out /etc/ssl/certs/apache-selfsigned.crt
  ```

- install `mod_wsgi_express` in virtual environment
  ```
  . venv/bin/activate && pip install mod-wsgi
  ```

- set group of root directory to `www-data` and make files accessible for group
  ```
  sudo chgrp www-data -R cwb-cads/
  sudo find ./ -type d -exec chmod 755 -R {} \;
  sudo find ./ -type f -exec chmod 644 {} \;
  sudo chmod -R g+w instance/
  ```

- make sure that root directory can be served by Apache
  + NB: all parent directories must be accessible by `www-data` (e.g. `chmod o+rx /home/<USER>/`)

- add the following to `/etc/apache2/sites-enabled/<HOSTS>.conf`
  ```apacheconf
  <Virtualhost ...>
  
	  ...
	  
	  WSGIDaemonProcess cwb-cads user=www-data group=www-data threads=4 python-home=/<PATH-TO-CWB-CADS>/venv locale='C.UTF-8'
	  WSGIScriptAlias /cwb-cads /<PATH-TO-CWB-CADS>/cwb-cads.wsgi
	  WSGIPassAuthorization on
	  
	  <Directory /<PATH-TO-CWB-CADS/>
		WSGIProcessGroup cwb-cads
		WSGIApplicationGroup %{GLOBAL}
		Order deny,allow
		Require all granted
	  </Directory>
	
	  ...
	  
  </Virtualhost>
  ```
  
- restart Apache
  ```
  sudo service apache2 restart
  ```

## Features

### standard features
- [x] query interface
- [x] concordancing
- [x] breakdown (using anchor points)
- [x] collocation
- [x] keyword analysis
- subcorpus creation
- meta distribution


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
