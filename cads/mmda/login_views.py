"""
Login views
"""

from functools import wraps

from apiflask import APIBlueprint
from flask import jsonify, request
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                get_jwt_identity, jwt_required,
                                verify_jwt_in_request)
from werkzeug.security import check_password_hash

from ..database import User

login_blueprint = APIBlueprint('login', __name__)


def user_required(fn):
    """
    Decorator: JWT Wrapper to validate user
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):  # pylint: disable=missing-docstring
        verify_jwt_in_request()
        identity = get_jwt_identity()
        username = request.view_args['username']

        # For regular tokens without roles
        if isinstance(identity, dict):
            identity = identity['username']

        if username != identity:
            return jsonify(msg='Unauthorized'), 403
        else:
            return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """
    Decorator: JWT Wrapper to allow admins only
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):  # pylint: disable=missing-docstring
        verify_jwt_in_request()
        identity = get_jwt_identity()

        # For regular tokens without roles
        if not isinstance(identity, dict):
            return jsonify(msg='Unauthorized'), 403

        if 'admin' not in identity['roles']:
            return jsonify(msg='Unauthorized'), 403
        else:
            return fn(*args, **kwargs)

    return wrapper


@login_blueprint.route('/login/', methods=['POST'])
def login():
    """
    Login route to get JWT token to access the API
    """

    # Check Request
    username = request.json.get('username', None)
    password = request.json.get('password', None)

    # Get User
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'msg': 'Unauthorized'}), 401

    # Check User
    if not user.is_active:
        return jsonify({'msg': 'Unauthorized'}), 401
    if not check_password_hash(user.password_hash, password):
        return jsonify({'msg': 'Unauthorized'}), 401

    # Create Token
    roles = [role.name for role in user.roles]
    tokens = {
        'current_identity': {'username': username, 'roles': roles},
        'access_token': create_access_token(identity={'username': username, 'roles': roles}),
        'refresh_token': create_refresh_token(identity=username)
    }

    return jsonify(tokens), 200


@login_blueprint.route('/refresh/', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Return a new token if the user has a refresh token
    """

    current_user = get_jwt_identity()
    ret = {
        'access_token': create_access_token(identity=current_user)
    }

    return jsonify(ret), 200


@login_blueprint.route('/test-login/', methods=['GET'])
@jwt_required()
def test_login():
    """
    Access the identity of the current user with get_jwt_identity
    """

    ret = {
        'current_identity': get_jwt_identity(),
    }

    return jsonify(ret), 200


@login_blueprint.route('/test-login/<username>/', methods=['GET'])
@user_required
def test_user(username):
    """
    Access the username and validate
    """

    ret = {
        'current_identity': get_jwt_identity(),
    }

    return jsonify(ret), 200


@login_blueprint.route('/test-admin/', methods=['GET'])
@admin_required
def test_admin():
    """
    Access the roles of the current user with get_jwt_claims
    """

    ret = {
        'current_identity': get_jwt_identity(),
    }

    return jsonify(ret), 200
