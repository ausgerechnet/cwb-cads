#! /usr/bin/env python
# -*- coding: utf-8 -*-

# import logging
import os

from apiflask import APIFlask, HTTPTokenAuth
from flask import redirect, request
# from flask.logging import default_handler
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy

from .version import __version__

CONFIG = os.getenv('CWB_CADS_CONFIG', default='cfg.ProdConfig')

NAME = 'cads'
TITLE = 'cwb-cads'

db = SQLAlchemy()
jwt = JWTManager()
auth = HTTPTokenAuth()


def create_app(config=CONFIG):

    # create and configure app
    app = APIFlask(NAME, title=TITLE, instance_relative_config=True,
                   version=__version__)

    # Setup Flask JWT and CORS
    jwt.init_app(app)
    CORS(app, supports_credentials=True)

    # will be overwritten if provided in config
    app.secret_key = 'dev'

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        app.logger.warning(f"could not create instance folder {app.instance_path}")

    # load config
    app.config.from_object(config)

    # also log cwb-ccc INFO messages
    # if app.config['DEBUG']:
    #     logger = logging.getLogger('ccc')
    #     logger.addHandler(default_handler)
    #     logger.setLevel(logging.WARNING)

    # init database connection
    if 'SQLALCHEMY_DATABASE_URI' not in app.config:
        db_path = os.path.join(app.instance_path, app.config['DB_NAME'])
        app.config.update(SQLALCHEMY_DATABASE_URI="sqlite:///" + db_path)
    app.logger.info("database URI: " + app.config['SQLALCHEMY_DATABASE_URI'])

    # init database
    from . import database

    # from .mmda import database as mmda_database
    # from .spheroscope import database as spheroscope_database
    app.register_blueprint(database.bp)
    # app.register_blueprint(mmda_database.bp)
    # app.register_blueprint(spheroscope_database.bp)
    db.init_app(app)

    # TODO increase timeout
    # connect_args={'timeout': 15}

    if 'sqlite' in app.config['SQLALCHEMY_DATABASE_URI']:
        # ensure FOREIGN KEY and WAL mode for sqlite3
        def _pragma_on_connect(dbapi_con, con_record):
            dbapi_con.execute("PRAGMA foreign_keys=ON;")
            dbapi_con.execute("PRAGMA journal_mode=WAL;")
        with app.app_context():
            from sqlalchemy import event
            event.listen(db.engine, 'connect', _pragma_on_connect)

    # say hello
    @app.get('/hello')
    @app.doc(tags=['Easter Eggs'])
    def hello():
        """Say hello.

        """
        return 'Hello back there', 200

    # automatically redirect to API docs from base URL
    @app.route('/')
    @app.doc(tags=['Easter Eggs'])
    def docs():
        """Redirect to API docs.

        """
        return redirect(request.base_url + "docs")

    # register blueprints
    from . import collocation, corpus, keyword, query, semantic_map, users

    app.register_blueprint(users.bp)
    app.register_blueprint(corpus.bp)
    app.register_blueprint(query.bp)
    app.register_blueprint(collocation.bp)
    app.register_blueprint(semantic_map.bp)
    app.register_blueprint(keyword.bp)

    from . import mmda
    app.register_blueprint(mmda.bp)

    from . import spheroscope
    app.register_blueprint(spheroscope.bp)

    return app
