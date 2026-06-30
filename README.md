# cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies 
![Build](https://github.com/ausgerechnet/cwb-cads/actions/workflows/backend-test.yml/badge.svg?branch=main)
![License](https://img.shields.io/github/license/ausgerechnet/cwb-cads?style=flat&color=lightgray&labelColor=gray)
[![Imports: association-measures](https://img.shields.io/badge/imports-association--measures-%231674b1?style=flat&labelColor=gray)](https://github.com/fau-klue/pandas-association-measures)
[![Imports: cwb-ccc](https://img.shields.io/badge/imports-cwb--ccc-%231674b1?style=flat&labelColor=gray)](https://github.com/ausgerechnet/cwb-ccc)

- implemented in Python/APIFlask
  + JWT authorisation
  + interactive OpenAPI documentation

- uses [cwb-ccc](https://github.com/ausgerechnet/cwb-ccc) for connecting to CWB
  + CWB must be installed and corpora must be encoded via `cwb-encode`
  + meta data can be stored separately or be parsed from structural attributes
  
- the repository also contains a beta version of a frontend (the "MMDA toolkit")

## Reference

Our methodology is explained in detail in [Heinrich & Evert (2024)](https://aclanthology.org/2024.cpss-1.3/).

```bibtex
@InProceedings{HeinrichEvert2024,
  author    = {Heinrich, Philipp and Evert, Stephanie},
  title     = {Operationalising the Hermeneutic Grouping Process in Corpus-assisted Discourse Studies},
  booktitle = {Proceedings of the 4th Workshop on Computational Linguistics for the Political and Social Sciences: Long and short papers},
  year      = {2024},
  editor    = {Klamm, Christopher and Lapesa, Gabriella and Ponzetto, Simone Paolo and Rehbein, Ines and Sen, Indira},
  pages     = {33--44},
  address   = {Vienna, Austria},
  month     = sep,
  publisher = {Association for Computational Linguistics},
  url       = {https://aclanthology.org/2024.cpss-1.3}
}
```

**Abstract:** We propose a framework for quantitative-qualitative research in corpus-assisted discourse studies (CADS), which operationalises the central process of manually forming groups of related words and phrases in terms of “discoursemes” and their constellations. We introduce an open-source implementation of this framework in the form of a REST API based on Corpus Workbench. Going through the workflow of a collocation analysis for fleeing and related terms in the German Federal Parliament, the paper gives details about the underlying algorithms, with available parameters and further possible choices. We also address multi-word units (which are often disregarded by CADS tools), a semantic map visualisation of collocations, and how to compute assocations between discoursemes.

We provide running instances of the [backend](https://corpora.linguistik.uni-erlangen.de/cwb-cads/docs) and [frontend](https://corpora.linguistik.uni-erlangen.de/mmda-v2/) on our web server.

For information regarding the original `mmda-v1` toolkit, see the [former repository](https://github.com/fau-klue/mmda-toolkit) and our [project website](https://www.linguistik.phil.fau.de/research/projects/past-projects/efe/mmda-toolkit/).

## Manual

We provide information

- regarding general CADS functionality in the [manual](manual/cwb-cads-functionality.html), and
- regarding discourseme-based functionality in the [MMDA manual](manual/cwb-cads-discoursemes.html).

## Installation and Configuration

### Backend: cwb-cads

- We recommend installing all dependencies of the API in a virtual environment:
  ```
  python3 -m venv venv
  . venv/bin/activate
  pip3 install -r requirements.txt
  ```
- The API is configured using `cfg.py` in the top-level directory. Use the [example config](cfg_example.py) as a starting point. It uses staging specific configs that can be activated using the `CWB_CADS_CONFIG` environment variable, e.g.
  ```
  export CWB_CADS_CONFIG=cfg.DevConfig
  ```
- Initialise the database:
  ```
  flask --app cads database init
  ```
- Import corpus settings from [JSON file](tests/corpora/corpora.json).:
  ```
  flask --app cads corpus import ${corpora.json}
  ```
- Meta data can be imported from separate files or from within the XML data stored in structural attributes of indexed corpora:
  ```
  flask --app cads corpus read-meta ${cwb_id} --level "text"
  ```
- You can also import pre-defined subcorpora using a [TSV file](tests/corpora/subcorpora-germaparl.tsv):
  ```
  flask --app cads corpus subcorpora ${cwb_id} ${subcorpora.tsv}
  ```
- Discoursemes can be imported using a [TSV file](tests/discoursemes/germaparl.tsv)
  ```
  flask --app cads discourseme import --path_in ${discoursemes.tsv}
  ```
  and can similarly be exported:
  ```
  flask --app cads discourseme export --path_out ${discoursemes.tsv}
  ```
- Start the development server
  ```
  flask --app cads --debug run
  ```

### Frontend: mmda-toolkit

Requirements:
- [node.js](https://nodejs.org/en)
- [nvm (node version manager)](https://github.com/nvm-sh/nvm) is recommended

Setup:
- Navigate to `frontend/`
- Install the correct node version. If you have nvm installed, you can just run:
  ```sh
  nvm install
  ```
  And to use it:
  ```sh
  nvm use
  ```
  Otherwise, install the correct node version manually as specified in [.nvmrc](frontend/.nvmrc)
- Install node dependencies:
  ```sh
  npm install
  ```
- Specify API in [vite.config.ts](frontend/vite.config.ts). This uses our [development server](https://corpora.linguistik.uni-erlangen.de/cwb-cads-dev) by default.
- Run development build of frontend:
  ```sh
  npm run dev
  ```

#### production

- set `target` in `frontend/mmda/vite.config.ts`
- set frontend URL `VITE_ROUTER_BASEPATH` in `frontend/mmda/.env.production`
- set backend URL `VITE_API_URL` in `frontend/mmda/.env.production`
- run `npm run build` and deploy `mmda/dist/`

## Acknowledgements ##

This work was supported by the Deutsche Forschungsgemeinschaft (DFG, German Research Foundation), project no. 466328567.

