#! /usr/bin/env python
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint

from . import discourseme, constellation


bp = APIBlueprint('mmda', __name__, url_prefix='/mmda')


bp.register_blueprint(discourseme.bp)
bp.register_blueprint(constellation.bp)
