"""
Discourseme view
"""

from apiflask import APIBlueprint
from flask import jsonify, request

from ..database import Discourseme, User
from .. import db
from .login_views import user_required


discourseme_blueprint = APIBlueprint('discourseme', __name__)


@discourseme_blueprint.route('/api/user/<username>/discourseme/', methods=['POST'])
@user_required
def create_discourseme(username):
    """Create a new discourseme.

    """

    user = User.query.filter_by(username=username).first()
    name = request.json.get('name', None)
    items = request.json.get('items', [])
    description = request.json.get('description', None)

    discourseme = Discourseme(name=name, description=description, items="\t".join(items), user_id=user.id)
    db.session.add(discourseme)
    db.session.commit()

    return jsonify({'msg': discourseme.id}), 201


@discourseme_blueprint.route('/api/user/<username>/discourseme/', methods=['GET'])
@user_required
def get_discoursemes(username):
    """List discoursemes for a user.

    """

    user = User.query.filter_by(username=username).first()
    discoursemes = [discourseme.serialize for discourseme in Discourseme.query.filter_by(user_id=user.id).all()]

    return jsonify(discoursemes), 200


@discourseme_blueprint.route('/api/user/<username>/discourseme/<discourseme>/', methods=['GET'])
@user_required
def get_discourseme(username, discourseme):
    """Get the details of a discourseme.

    """

    user = User.query.filter_by(username=username).first()
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()

    return jsonify(discourseme.serialize), 200


@discourseme_blueprint.route('/api/user/<username>/discourseme/<discourseme>/', methods=['PUT'])
@user_required
def update_discourseme(username, discourseme):
    """
    Update the details of a discourseme
    """

    user = User.query.filter_by(username=username).first()
    name = request.json.get('name', None)
    items = [item for item in request.json.get('items', [])]
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()

    if not discourseme:
        return jsonify({'msg': 'No such discourseme'}), 404

    discourseme.name = name
    discourseme.items = "\t".join(items)
    db.session.commit()

    return jsonify({'msg': discourseme.id}), 200


@discourseme_blueprint.route('/api/user/<username>/discourseme/<discourseme>/', methods=['DELETE'])
@user_required
def delete_discourseme(username, discourseme):
    """
    Delete a discourseme
    """

    user = User.query.filter_by(username=username).first()
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'No such discourseme'}), 404

    db.session.delete(discourseme)
    db.session.commit()

    return jsonify({'msg': 'Deleted'}), 200
