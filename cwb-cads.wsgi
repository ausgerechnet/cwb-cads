#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from logging.config import dictConfig

dir_path = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, dir_path)

from cads import create_app
from cfg import ProdConfig

dictConfig({
    'version': 1,
    'formatters': {
        'default': {
            'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        }
    },
    'handlers': {
        'wsgi': {
            'class': 'logging.handlers.RotatingFileHandler',
            "formatter": "default",
            "filename": os.path.join(dir_path, "instance", "mmda.log"),
            "maxBytes": 10000000,
            "backupCount": 10,
            "delay": "True"
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    },
    'loggers':{
        'cads': {
            'level': 'DEBUG',
            'handlers': ['wsgi'],
            'propagate': False
        }
    }
})

application = create_app(ProdConfig)
