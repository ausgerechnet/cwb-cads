"""
Import the blueprints here
"""

from apiflask import APIBlueprint

from .admin_views import admin_blueprint
from .collocation_views import collocation_blueprint
from .constellation_views import constellation_blueprint
from .corpus_views import corpus_blueprint
from .discourseme_views import discourseme_blueprint
from .keyword_views import keyword_blueprint
from .login_views import login_blueprint
from .user_views import user_blueprint

api_blueprint = APIBlueprint('api', __name__)


api_blueprint.register_blueprint(admin_blueprint)
api_blueprint.register_blueprint(collocation_blueprint)
api_blueprint.register_blueprint(constellation_blueprint)
api_blueprint.register_blueprint(corpus_blueprint)
api_blueprint.register_blueprint(discourseme_blueprint)
api_blueprint.register_blueprint(keyword_blueprint)
api_blueprint.register_blueprint(login_blueprint)
api_blueprint.register_blueprint(user_blueprint)
