#! /usr/bin/env python
# -*- coding: utf-8 -*-

import os

from apiflask import APIFlask
from flask_sqlalchemy import SQLAlchemy

from .version import __version__

CONFIG = 'cfg.ProdConfig'

NAME = 'mmda'
TITLE = 'MMDA v2'

db = SQLAlchemy()


def create_app(config=CONFIG):

    # create and configure app
    app = APIFlask(NAME, title=TITLE, instance_relative_config=True,
                   version=__version__)

    # will be overwritten if provided in config
    app.secret_key = 'dev'

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
    except OSError:
        app.logger.warning("could not create instance folder")

    app.config.from_object(config)

    # init database connection
    if 'SQLALCHEMY_DATABASE_URI' not in app.config:
        app.config.update(
            SQLALCHEMY_DATABASE_URI="sqlite:///" + os.path.join(
                app.instance_path, app.config['DB_NAME']
            )
        )
    app.logger.info("   - database uri:  " + app.config['SQLALCHEMY_DATABASE_URI'])

    # init database
    from . import database
    app.register_blueprint(database.bp)
    db.init_app(app)

    # ensure FOREIGN KEY for sqlite3
    if 'sqlite' in app.config['SQLALCHEMY_DATABASE_URI']:
        def _fk_pragma_on_connect(dbapi_con, con_record):  # noqa
            dbapi_con.execute('pragma foreign_keys=ON')
        with app.app_context():
            from sqlalchemy import event
            event.listen(db.engine, 'connect', _fk_pragma_on_connect)

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
        from flask import redirect
        return redirect('/docs')

    # register blueprints
    from . import (breakdown, collocation, concordance, constellation, corpus,
                   discourseme, query, users, semantic_map)

    app.register_blueprint(users.bp)
    app.register_blueprint(corpus.bp)

    app.register_blueprint(discourseme.bp)
    app.register_blueprint(constellation.bp)

    collocation.bp.register_blueprint(semantic_map.bp)

    query.bp.register_blueprint(breakdown.bp)
    query.bp.register_blueprint(collocation.bp)
    query.bp.register_blueprint(concordance.bp)

    app.register_blueprint(query.bp)

    return app
