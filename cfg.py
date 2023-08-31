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

    CCC_CQP_BIN = str(getenv('CQP_BIN', default='cqp'))
    CCC_LIB_DIR = getenv('CCC_LIB_DIR', None)


class ProdConfig(Config):

    DEBUG = False
    TESTING = False

    SECRET_KEY = "8!9!zU3nC@fBc5sA"
    SESSION_COOKIE_SECURE = True

    DB_NAME = "mmda.sqlite"  # relative to instance folder
    ADMIN_PASSWORD = "mmda-admin"  # only user (name = 'admin')

    CORPORA = 'tests/corpora/corpora.json'
    CCC_REGISTRY_DIR = str(getenv('CORPUS_REGISTRY', default='tests/corpora/registry/'))

    CCC_DATA_DIR = str(getenv('CCC_DATA_DIR', default='/tmp/mmda-ccc-cache/'))
    ANYCACHE_DIR = str(getenv('ANYCACHE_DIR', '/tmp/mmda-anycache/'))

    JWT_ACCESS_TOKEN_EXPIRES = 60*60*12
    JWT_REFRESH_TOKEN_EXPIRES = 60*60*12


class DevConfig(Config):

    DEBUG = True
    # TESTING = True

    DB_NAME = "mmda-dev.sqlite"
    ADMIN_PASSWORD = "mmda-admin"

    CORPORA = '/home/ausgerechnet/corpora/cwb/mmda-corpora.json'
    CCC_REGISTRY_DIR = str(getenv('CORPUS_REGISTRY', default='tests/corpora/registry/'))

    CCC_DATA_DIR = 'instance/dev-ccc-data/'
    ANYCACHE_DIR = 'instance/dev-mmda-anycache/'

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
    ANYCACHE_DIR = 'instance/test-mmda-anycache/'

    JWT_ACCESS_TOKEN_EXPIRES = False
    JWT_REFRESH_TOKEN_EXPIRES = False
