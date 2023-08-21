from apiflask import APIBlueprint, Schema
from flask import g, request
from .users import auth
from .database import Discourseme
from apiflask.fields import Integer, String
from . import db

bp = APIBlueprint('discourseme', __name__, url_prefix='/discourseme')


class DiscoursemeIn(Schema):

    name = String()
    description = String()


class DiscoursemeOut(Schema):

    id = Integer()
    name = String()
    description = String()


@bp.post('/')
@bp.input(DiscoursemeIn)
@bp.output(DiscoursemeOut)
@bp.auth_required(auth)
def create(data):
    """ Create new discourseme.

    """

    discourseme = Discourseme(
        user_id=g.user.id,
        name=request.json['name'],
        description=request.json['description'],
    )
    db.session.add(discourseme)
    db.session.commit()
    return DiscoursemeOut().dump(discourseme), 200
