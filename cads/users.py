#! /usr/bin/env python
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, String
from flask import current_app
from flask_jwt_extended import create_access_token, decode_token, create_refresh_token
from werkzeug.security import check_password_hash, generate_password_hash

from . import auth, db
from .database import User

bp = APIBlueprint('user', __name__, url_prefix='/user')


class UserRegister(Schema):

    username = String(required=True)
    password = String(required=True)
    confirm_password = String(required=True)
    first_name = String()
    last_name = String()
    email = String()


class UserIn(Schema):

    username = String(required=True)
    password = String(required=True)


class UserUpdate(Schema):

    old_password = String(required=True)
    new_password = String(required=True)
    confirm_password = String(required=True)


class UserOut(Schema):

    id = Integer(required=True)
    username = String(required=True)
    # roles = List(String())


class HTTPTokenOut(Schema):

    access_token = String(required=False)
    refresh_token = String(required=False)


class HTTPRefreshTokenIn(Schema):

    refresh_token = String()


@auth.verify_token
def verify_token(token):

    if not token:
        return abort(403, "invalid token")
    data = decode_token(token)
    user = db.get_or_404(User, data['sub']['id'])

    return user


@bp.post('/login')
@bp.input(UserIn, location='form')
@bp.output(HTTPTokenOut)
def login(data):
    """Login with name and password to get JWT token

    """
    username = data['username']
    password = data['password']

    user = User.query.filter_by(username=username).first()

    if user is None:
        return abort(404, f'username {username} not found')
    if not check_password_hash(user.password_hash, password):
        return abort(401, 'incorrect password')

    tokens = {
        'access_token': create_access_token(UserOut().dump(user)),
        'refresh_token': create_refresh_token(UserOut().dump(user))
    }

    return tokens, 200


@bp.post('/refresh')
@bp.input(HTTPRefreshTokenIn)
@bp.output(HTTPTokenOut)
def refresh(data):
    """Return a new token if the user has a refresh token

    """

    refresh_token = data['refresh_token']
    data = decode_token(refresh_token)
    user = db.get_or_404(User, data['sub']['id'])

    tokens = {
        'access_token': create_access_token(UserOut().dump(user)),
        'refresh_token': create_refresh_token(UserOut().dump(user))
    }

    return tokens, 200


@bp.get('/identify')
@bp.auth_required(auth)
def identify():
    """Identify who is logged with token

    """

    return UserOut().dump(auth.current_user), 200


@bp.post('/')
@bp.input(UserRegister)
@bp.output(UserOut)
@bp.auth_required(auth)
def create_user(data):
    """Register new user.

    """

    # does user already exist?
    user = User.query.filter_by(username=data['username']).first()
    if user:
        current_app.logger.debug('Username %s already taken', data['username'])
        return 'Username already taken', 409

    user = User(
        username=data['username'],
        email=data['email'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()

    return UserOut().dump(user), 200


@bp.get('/<id>')
@bp.output(UserOut)
@bp.auth_required(auth)
def get_user(id):
    """Get details of user.

    """

    user = db.get_or_404(User, id)

    return UserOut().dump(user), 200


@bp.get('/')
@bp.output(UserOut(many=True))
@bp.auth_required(auth)
def get_users():
    """Get all users.

    """

    users = User.query.all()

    return [UserOut().dump(user) for user in users], 200


@bp.patch('/<id>')
@bp.input(UserUpdate)
@bp.output(UserOut)
@bp.auth_required(auth)
def update_user(id, data):
    """Update details of a user.

    """

    user = auth.current_user
    user.password_hash = generate_password_hash(data['new_password'])
    db.session.commit()

    return UserOut().dump(user), 200
