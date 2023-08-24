"""
Discourseme view
"""

from ccc.utils import cqp_escape
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

    # Check request
    name = request.json.get('name', None)
    items = request.json.get('items', [])
    description = request.json.get('description', None)

    # Get User
    user = User.query.filter_by(username=username).first()

    # Add Discourseme to DB
    discourseme = Discourseme(name=name, description=description, items="\t".join(items), user_id=user.id)
    db.session.add(discourseme)
    db.session.commit()

    return jsonify({'msg': discourseme.id}), 201


@discourseme_blueprint.route('/api/user/<username>/discourseme/', methods=['GET'])
@user_required
def get_discoursemes(username):
    """List discoursemes for a user.

    """

    # Get User
    user = User.query.filter_by(username=username).first()

    discoursemes = Discourseme.query.filter_by(user_id=user.id).all()
    discoursemes_list = [discourseme.serialize for discourseme in discoursemes]

    return jsonify(discoursemes_list), 200


@discourseme_blueprint.route('/api/user/<username>/discourseme/<discourseme>/', methods=['GET'])
@user_required
def get_discourseme(username, discourseme):
    """Get the details of a discourseme.

    """

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Discourseme from DB
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()

    return jsonify(discourseme.serialize), 200


@discourseme_blueprint.route('/api/user/<username>/discourseme/<discourseme>/', methods=['PUT'])
@user_required
def update_discourseme(username, discourseme):
    """
    Update the details of a discourseme
    """

    # Check Request
    name = request.json.get('name', None)
    items = request.json.get('items', [])
    items = [cqp_escape(item) for item in items]

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Discourseme from DB
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

    # Get User
    user = User.query.filter_by(username=username).first()

    # Get Discourseme from DB
    discourseme = Discourseme.query.filter_by(id=discourseme, user_id=user.id).first()
    if not discourseme:
        return jsonify({'msg': 'No such discourseme'}), 404

    db.session.delete(discourseme)
    db.session.commit()

    return jsonify({'msg': 'Deleted'}), 200
