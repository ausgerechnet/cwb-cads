#! /usr/bin/env python
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint

from .. import library

from . import slot_query, query_history, flexiconc

bp = APIBlueprint('spheroscope', __name__, url_prefix='/spheroscope')


bp.register_blueprint(slot_query.bp)
bp.register_blueprint(query_history.bp)
bp.register_blueprint(flexiconc.bp)
