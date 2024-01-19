#! /usr/bin/env python
# -*- coding: utf-8 -*-

from apiflask import APIBlueprint, HTTPBasicAuth, Schema, abort
from apiflask.fields import Integer, List, String
from flask import current_app, g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from . import db
from .database import User

bp = APIBlueprint('user', __name__, url_prefix='/user')
auth = HTTPBasicAuth()


@auth.verify_password
def verify_password(username, password):
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        return user
    return None


class UserRegister(Schema):

    username = String(required=True)
    first_name = String()
    last_name = String()
    email = String()
    password = String(required=True)
    confirm_password = String(required=True)


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
    roles = List(String())


@bp.post('/login')
@bp.input(UserIn, location='form')
@bp.output(UserOut)
def login(data):
    """Login with name and password.

    """
    username = request.form.get('username')
    password = request.form.get('password')

    user = User.query.filter_by(username=username).first()

    if user is None:
        return abort(404, f'username {username} not found')
    if not check_password_hash(user.password_hash, password):
        return abort(401, 'incorrect password')

    # clear session and set user
    session.clear()
    session['user_id'] = user.id
    g.user = user

    return UserOut().dump(user), 200


@bp.get('/session')
@bp.output(UserOut)
def login_session():
    """Identify who is logged in via session"""

    user_id = session.get('user_id', None)
    if not user_id:
        return abort(404, 'no user in session')
    user = db.get_or_404(User, user_id)

    return UserOut().dump(user), 200


@bp.get('/auth')
@bp.output(UserOut)
@bp.auth_required(auth)
def login_auth():
    """Identify who is logged in via auth"""

    return UserOut().dump(auth.current_user), 200


@bp.post('/logout')
@bp.auth_required(auth)
def logout():
    """Logout current user.

    """

    session.clear()

    return 'Logout successful.', 200


@bp.post('/')
@bp.input(UserIn)
@bp.output(UserOut)
@bp.auth_required(auth)
def create_user(username):
    """Register new user.

    """

    username = request.json.get('username')
    first_name = request.json.get('first_name')
    last_name = request.json.get('last_name')
    email = request.json.get('email')
    password = request.json.get('password')

    # does user already exist?
    user = User.query.filter_by(username=username).first()
    if user:
        current_app.logger.debug('User %s already exists', username)
        return jsonify({'msg': 'User already exists'}), 409

    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password_hash=generate_password_hash(password)
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
def update_user(username):
    """Update details of a user.

    """

    # Check Request
    new_password = request.json.get('password')

    # Get User
    user = User.query.filter_by(username=username).first()
    if not user:
        current_app.logger.debug('No such user %s', username)
        return jsonify({'msg': 'No such user'}), 404

    # Generate salted password hash
    hashed_password = generate_password_hash(new_password)

    if not hashed_password:
        current_app.logger.debug('Password could not be changed. No hash generated')
        return jsonify({'msg': 'Password could not be changed'}), 500

    # Only set if we got a valid hash
    user.password = hashed_password
    db.session.commit()

    current_app.logger.debug('Password updated for user %s', user.id)
    return UserOut().dump(user), 200
