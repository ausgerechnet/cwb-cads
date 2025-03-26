#!/usr/bin/python3
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint

from . import (constellation, constellation_description,
               constellation_description_collection,
               constellation_description_collocation,
               constellation_description_keyword,
               constellation_description_semantic_map, discourseme,
               discourseme_description)

bp = APIBlueprint('mmda', __name__, url_prefix='/mmda')


discourseme.bp.register_blueprint(discourseme_description.bp)
bp.register_blueprint(discourseme.bp)

constellation_description.bp.register_blueprint(constellation_description_keyword.bp)
constellation_description.bp.register_blueprint(constellation_description_collocation.bp)
constellation_description.bp.register_blueprint(constellation_description_semantic_map.bp)
constellation_description.bp.register_blueprint(constellation_description_collection.bp)
constellation.bp.register_blueprint(constellation_description.bp)
bp.register_blueprint(constellation.bp)
