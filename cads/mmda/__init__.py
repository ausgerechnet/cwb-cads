#!/usr/bin/python3
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint

from . import constellation, discourseme

bp = APIBlueprint('mmda', __name__, url_prefix='/mmda')


bp.register_blueprint(discourseme.bp)
bp.register_blueprint(constellation.bp)
