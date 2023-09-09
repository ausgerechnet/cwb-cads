#! /data/Philipp/cwb-cads/venv/bin/python3
# -*- coding: utf-8 -*-

import sys
import os

root = '/data/Philipp/cwb-cads/'
sys.path.insert(0, root)

from logging.config import dictConfig

dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.handlers.RotatingFileHandler',
        "formatter": "default",
        "filename": os.path.join(root, "instance/mmda.log"),
        "maxBytes": 1000000,
        "backupCount": 10,
        "delay": "True",
        "level": "DEBUG"
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    }
})


from mmda import create_app
from cfg import ProdConfig

application = create_app(ProdConfig)
