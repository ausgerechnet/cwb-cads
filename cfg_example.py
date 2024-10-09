#! /usr/bin/env python
# -*- coding: utf-8 -*-

from os import getenv

from cads.version import __version__


class Config:

    OPENAPI_VERSION = '3.0.2'

    INFO = {
        'title': 'cwb-cads',
        'description': 'cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies',
        'contact': {
            'name': 'Philipp Heinrich',
            'url': 'https://philipp-heinrich.eu',
            'email': 'philipp.heinrich@fau.de'
        },
        'version': __version__,
    }

    SERVERS = [
        {
            'name': 'Development Server',
            'url': 'https://corpora.linguistik.uni-erlangen.de/cwb-cads-dev/'
        },
        {
            'name': 'Local Server',
            'url': 'http://127.0.0.1:5000/'
        },
        {
            'name': 'Production Server',
            'url': 'https://corpora.linguistik.uni-erlangen.de/cwb-cads/'
        }
    ]

    EXTERNAL_DOCS = {
        'description': 'GitHub repository',
        'url': 'https://github.com/ausgerechnet/cwb-cads'
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CCC_CQP_BIN = str(getenv('CQP_BIN', default='cqp'))


class ProdConfig(Config):

    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True

    SECRET_KEY = "CHANGE-ME-IN-PRODUCTION"

    DB_NAME = 'mmda.sqlite'
    ADMIN_PASSWORD = '0000'

    CORPORA = 'tests/corpora/corpora.json'
    CCC_REGISTRY_DIR = 'tests/corpora/registry/'
    CCC_DATA_DIR = 'instance/cwb-cads-ccc-data-test/'
    CCC_LIB_DIR = 'instance/cwb-cads-ccc-lib-test/'

    JWT_ACCESS_TOKEN_EXPIRES = 60*30
    JWT_REFRESH_TOKEN_EXPIRES = 60*60*12


class DevConfig(Config):

    DEBUG = True

    DB_NAME = 'mmda-dev.sqlite'
    ADMIN_PASSWORD = '0000'

    CORPORA = 'tests/corpora/corpora.json'
    CCC_REGISTRY_DIR = 'tests/corpora/registry/'
    CCC_DATA_DIR = 'instance/cwb-cads-ccc-data-test/'
    CCC_LIB_DIR = 'instance/cwb-cads-ccc-lib-test/'

    JWT_ACCESS_TOKEN_EXPIRES = False
    JWT_REFRESH_TOKEN_EXPIRES = False


class TestConfig(Config):

    DEBUG = True
    TESTING = True,
    APP_ENV = 'testing'

    DB_NAME = 'mmda-test.sqlite'
    ADMIN_PASSWORD = '0000'

    CORPORA = 'tests/corpora/corpora.json'
    CCC_REGISTRY_DIR = 'tests/corpora/registry/'
    CCC_DATA_DIR = 'instance/cwb-cads-ccc-data-test/'
    CCC_LIB_DIR = 'instance/cwb-cads-ccc-lib-test/'

    JWT_ACCESS_TOKEN_EXPIRES = False
    JWT_REFRESH_TOKEN_EXPIRES = False
