install:
	python3 -m venv venv && \
	. venv/bin/activate && \
	pip3 install -U pip setuptools wheel && \
	pip3 install -r requirements.txt

init:
	. venv/bin/activate && \
	flask --app mmda database init && \
	flask --app mmda discourseme import --path_in "tests/discoursemes/russland.tsv" && \
	flask --app mmda discourseme import --path_in "tests/discoursemes/germaparl.tsv"

run:
	. venv/bin/activate && \
	flask --app mmda --debug run

test:
	. venv/bin/activate && \
	pytest -s -v

export:
	. venv/bin/activate && \
	flask --app mmda discourseme export
