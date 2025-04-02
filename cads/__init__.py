#! /usr/bin/env python
# -*- coding: utf-8 -*-

# import logging
import os

import werkzeug.exceptions
from apiflask import APIFlask, HTTPTokenAuth
from flask import jsonify, redirect, request
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
    #     logger.setLevel(logging.DEBUG)

    # dynamic error handler for all HTTP errors
    @app.errorhandler(werkzeug.exceptions.HTTPException)
    def handle_exception(error):
        """Global error handler for all HTTP exceptions."""
        if isinstance(error, werkzeug.exceptions.HTTPException):
            status_code = error.code
            error_name = error.name
            message = error.description
        else:
            status_code = 500
            error_name = "Internal Server Error"
            message = "An unexpected error occurred. Probably my fault."

        response = jsonify({
            "error": error_name,
            "message": message
        })
        response.status_code = status_code
        return response

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

    if 'sqlite' in app.config['SQLALCHEMY_DATABASE_URI']:
        def _pragma_on_connect(dbapi_con, con_record):
            # ensure FOREIGN KEY constraints
            dbapi_con.execute("PRAGMA foreign_keys=ON;")
            # ensure WAL mode
            dbapi_con.execute("PRAGMA journal_mode=WAL;")
            # set timeout to 30s (in ms)
            dbapi_con.execute("PRAGMA busy_timeout=30000;")
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
