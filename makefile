install:
	python3 -m venv venv && \
	. venv/bin/activate && \
	pip3 install -U pip setuptools wheel && \
	pip3 install -r requirements.txt

init:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads database init && \
	flask --app cads discourseme import --path_in "../thesis/ccc-analyses/case-studies/norm-rechts/*-discoursemes.tsv" && \
	flask --app cads corpus subcorpora "GERMAPARL-1949-2021" "../thesis/ccc-analyses/case-studies/norm-rechts/subcorpora-lp.tsv"
#	flask --app cads discourseme import --path_in "tests/discoursemes/russland.tsv" && \
#	flask --app cads discourseme import --path_in "tests/discoursemes/germaparl.tsv" && \

update_corpora:
	. venv/bin/activate && \
	export CWB_CADS_CONFIG=cfg.DevConfig && \
	flask --app cads database update-corpora "tests/corpora/corpora-add.json"

init_test:
	. venv/bin/activate && \
	flask --app cads database init && \
	flask --app cads discourseme import --path_in "tests/discoursemes/germaparl.tsv" && \
	flask --app cads discourseme import --path_in "tests/discoursemes/russland.tsv" && \

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
