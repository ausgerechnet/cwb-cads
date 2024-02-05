install:
	python3 -m venv venv && \
	. venv/bin/activate && \
	pip3 install -U pip setuptools wheel && \
	pip3 install -r requirements.txt

init:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads database init # && \
#	flask --app cads discourseme import --path_in "../thesis/ccc-analyses/case-studies/norm-rechts/*-discoursemes.tsv" && \
#	flask --app cads corpus subcorpora "GERMAPARL-1949-2021" "../thesis/ccc-analyses/case-studies/norm-rechts/subcorpora-*.tsv"
#	flask --app cads discourseme import --path_in "tests/discoursemes/russland.tsv" && \
#	flask --app cads discourseme import --path_in "tests/discoursemes/germaparl.tsv" && \

corpora:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads corpus import
#	flask --app cads corpus subcorpora "GERMAPARL-1949-2021" "../thesis/ccc-analyses/case-studies/norm-rechts/subcorpora-*.tsv"

discoursemes:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads discourseme import --path_in "../thesis/ccc-analyses/case-studies/norm-rechts/*-discoursemes.tsv"
#	flask --app cads discourseme import --path_in "tests/discoursemes/russland.tsv" && \
#	flask --app cads discourseme import --path_in "tests/discoursemes/germaparl.tsv" && \

examples: init corpora discoursemes


init_test:
	. venv/bin/activate && \
	flask --app cads database init && \
	flask --app cads discourseme import --path_in "tests/discoursemes/germaparl.tsv" && \
	flask --app cads discourseme import --path_in "tests/discoursemes/russland.tsv"

run:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads --debug run

run_test:
	. venv/bin/activate && \
	flask --app cads --debug run

test:
	. venv/bin/activate && \
	pytest -s -v

export:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads discourseme export

apispec:
	. venv/bin/activate && \
	flask --app cads spec > openapi.json
