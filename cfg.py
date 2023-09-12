#! /usr/bin/env python
# -*- coding: utf-8 -*-

from os import getenv
from cads.version import __version__


class Config:

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPENAPI_VERSION = '3.0.2'
    INFO = {
        'title': 'cwb-cads',
        'description': 'cwb-cads: CWB-based API for Corpus-Assisted Discourse Studies',
        'contact': {
            'name': 'Philipp Heinrich',
            'url': 'https://philipp-heinrich.eu',
            'email': 'philipp.heinrich@fau.de'
        },
        'version': __version__
    }

    CCC_CQP_BIN = str(getenv('CQP_BIN', default='cqp'))
    CCC_LIB_DIR = getenv('CCC_LIB_DIR', None)


class ProdConfig(Config):

    DEBUG = False
    TESTING = False

    SECRET_KEY = "8!9!zU3nC@fBc5sA"
    SESSION_COOKIE_SECURE = True

    DB_NAME = "mmda.sqlite"  # relative to instance folder
    ADMIN_PASSWORD = "mmda-admin"  # only user (name = 'admin')

    CORPORA = '/data/Philipp/mmda-corpora.json'
    CCC_REGISTRY_DIR = '/data/Philipp/cwb-cads/tests/corpora/registry'

    CCC_DATA_DIR = str(getenv('CCC_DATA_DIR', default='/tmp/mmda-ccc-data/'))

    JWT_ACCESS_TOKEN_EXPIRES = 60*60*12
    JWT_REFRESH_TOKEN_EXPIRES = 60*60*12


class DevConfig(Config):

    DEBUG = True

    DB_NAME = "mmda-dev.sqlite"
    ADMIN_PASSWORD = "mmda-admin"

    CORPORA = '/home/ausgerechnet/corpora/cwb/mmda-corpora.json'
    CCC_REGISTRY_DIR = '/home/ausgerechnet/corpora/cwb/registry/'

    CCC_DATA_DIR = '/tmp/dev-ccc-data/'

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

    CCC_DATA_DIR = 'instance/test-ccc-data/'

    JWT_ACCESS_TOKEN_EXPIRES = False
    JWT_REFRESH_TOKEN_EXPIRES = False
