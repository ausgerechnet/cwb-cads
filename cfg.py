from os import getenv


class Config:

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPENAPI_VERSION = '3.0.2'
    INFO = {
        'description': 'mmda-v2 backend',
        'contact': {
            'name': 'Philipp Heinrich',
            'url': 'https://philipp-heinrich.eu',
            'email': 'philipp.heinrich@fau.de'
        }
    }


class ProdConfig(Config):

    DEBUG = False
    TESTING = False
    SECRET_KEY = "8!9!zU3nC@fBc5sA"

    DB_NAME = "mmda.sqlite"  # relative to instance folder
    ADMIN_PASSWORD = "0000"  # only user (name = 'admin')

    SESSION_COOKIE_SECURE = True
    CORPORA = '/home/ausgerechnet/corpora/cwb/mmda-corpora.json'

    CCC_REGISTRY_DIR = str(getenv('CORPUS_REGISTRY', default='tests/corpora/registry/'))
    CCC_CQP_BIN = str(getenv('CQP_BIN', default='cqp'))
    CCC_LIB_DIR = getenv('CCC_LIB_DIR', None)

    CCC_DATA_DIR = str(getenv('CCC_DATA_DIR', default='/tmp/mmda-ccc-cache/'))
    ANYCACHE_DIR = str(getenv('ANYCACHE_DIR', '/tmp/mmda-anycache/'))


class TestConfig(Config):

    DEBUG = True
    TESTING = True,
    APP_ENV = 'testing'

    DB_NAME = 'mmda-test.sqlite'
    ADMIN_PASSWORD = '0000'

    CORPORA = 'tests/corpora/corpora.json'
    CCC_REGISTRY_DIR = 'tests/corpora/registry/'
    CCC_DATA_DIR = 'instance/ccc-data-testing/'
    ANYCACHE_DIR = 'instance/mmda-anycache-testing/'
    CCC_CQP_BIN = 'cqp'
    CCC_LIB_DIR = None
