config = cfg.DevConfig
cwb_id = GERMAPARL1386
# cwb_id = GERMAPARL-1949-2021
meta = tests/corpora/germaparl-meta.tsv
# meta = ../thesis/ccc-analyses/meta-data/germaparl-speaker-nodes.tsv.gz
subcorpora = tests/corpora/germaparl-subcorpora.tsv
# subcorpora = ../norm-rechts/outreach/cpss-2024/subcorpora.tsv
# subcorpora = ../thesis/ccc-analyses/case-studies/norm-rechts/subcorpora-*.tsv
discoursemes = tests/discoursemes/climate-change.tsv
# discoursemes = "../*-discoursemes.tsv"
library = tests/library/

install:
	python3 -m venv venv && \
	. venv/bin/activate && \
	pip3 install -U pip setuptools wheel && \
	pip3 install -r requirements.txt

nvm:
	. ${NVM_DIR}/nvm.sh && cd frontend && nvm use && $(CMD)

install_frontend:
	make nvm CMD="npm install"

apispec:
	. venv/bin/activate && \
	flask --app cads spec > openapi.json


###############
# DEVELOPMENT #
###############

clean:
	rm -rf ./instance/

init:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=${config} && \
	flask --app cads database init

corpora:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=${config} && \
	flask --app cads corpus import

subcorpora:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=${config} && \
	flask --app cads corpus subcorpora ${cwb_id} ${subcorpora}

discoursemes:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=${config} && \
	flask --app cads discourseme import --path_in ${discoursemes}

library:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads library import-library --corpus_id 1 --lib_dir "tests/library/"

examples: init corpora discoursemes

run:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=${config} && \
	flask --app cads --debug run

run_frontend:
	make nvm CMD="npm run dev"

########
# TEST #
########

lint:
	. venv/bin/activate && \
	pylint --recursive y --rcfile=.pylintrc cads/

test:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.TestConfig && \
	pytest -s -v

test_examples:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.TestConfig && \
	flask --app cads database init && \
	flask --app cads corpus import && \
	flask --app cads corpus read-meta "GERMAPARL1386" --path "tests/corpora/germaparl-meta.tsv" && \
	flask --app cads corpus subcorpora "GERMAPARL1386" "tests/corpora/germaparl-subcorpora.tsv" && \
	flask --app cads discourseme import --path_in "tests/discoursemes/germaparl.tsv"

test_run:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.TestConfig && \
	flask --app cads --debug run
