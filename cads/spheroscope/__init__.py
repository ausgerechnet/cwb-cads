#! /usr/bin/env python
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint

from . import library, slot_query

bp = APIBlueprint('spheroscope', __name__, url_prefix='/spheroscope')


bp.register_blueprint(slot_query.bp)
bp.register_blueprint(library.bp)
