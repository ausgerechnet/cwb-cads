#! /usr/bin/env python
# -*- coding: utf-8 -*-


from apiflask import APIBlueprint, Schema, abort
from apiflask.fields import Integer, String
from flask import current_app
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                decode_token)
from functools import wraps
from werkzeug.security import check_password_hash, generate_password_hash

from . import auth, db
from .database import User, Role

import click

bp = APIBlueprint('user', __name__, url_prefix='/user', cli_group='user')


@auth.verify_token
def verify_token(token):

    if not token:
        return abort(403, "missing authorization header")
    data = decode_token(token)
    user = db.get_or_404(User, data['sub']['id'])

    return user


def admin_access_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):

        role_names = {role.name for role in auth.current_user.roles}

        if "admin" not in role_names:
            abort(403, "only admin users can do admin stuff.")

        return func(*args, **kwargs)

    return wrapper


def write_access_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):

        role_names = {role.name for role in auth.current_user.roles}

        if "read-only" in role_names:
            abort(403, "read-only users cannot modify data.")

        return func(*args, **kwargs)

    return wrapper


################
# API schemata #
################

# Input
class UserRegister(Schema):

    username = String(required=True)
    password = String(required=True)
    confirm_password = String(required=True)
    first_name = String(required=False, allow_none=True)
    last_name = String(required=False, allow_none=True)
    email = String(required=False, allow_none=True)


class UserIn(Schema):

    username = String(required=True)
    password = String(required=True)


class UserUpdate(Schema):

    old_password = String(required=True)
    new_password = String(required=True)
    confirm_password = String(required=True)


# Output
class UserOut(Schema):

    id = Integer(required=True)
    username = String(required=True)


class HTTPTokenOut(Schema):

    access_token = String(required=True)
    refresh_token = String(required=True)


class HTTPRefreshTokenIn(Schema):

    refresh_token = String(required=True)


#################
# API endpoints #
#################
@bp.post('/login')
@bp.input(UserIn, location='form')
@bp.output(HTTPTokenOut)
def login(form_data):
    """Log in with name and password to get JWT token.

    """
    username = form_data['username']
    password = form_data['password']

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
def refresh(json_data):
    """Return new access and refresh tokens using a refresh token.

    """

    refresh_token = json_data['refresh_token']
    data = decode_token(refresh_token)
    user = db.get_or_404(User, data['sub']['id'])

    tokens = {
        'access_token': create_access_token(UserOut().dump(user)),
        'refresh_token': create_refresh_token(UserOut().dump(user))
    }

    return tokens, 200


@bp.get('/identify')
@bp.auth_required(auth)
@bp.output(UserOut)
def identify():
    """Identify who is logged in with JWT token.

    """

    return UserOut().dump(auth.current_user), 200


@bp.post('/')
@bp.input(UserRegister)
@bp.output(UserOut)
@bp.auth_required(auth)
@admin_access_required
def create_user(json_data):
    """Register new user.

    """

    # does user already exist?
    user = User.query.filter_by(username=json_data['username']).first()
    if user:
        current_app.logger.debug('Username %s already taken', json_data['username'])
        return 'Username already taken', 409

    user = User(
        username=json_data['username'],
        email=json_data['email'],
        first_name=json_data['first_name'],
        last_name=json_data['last_name'],
        password_hash=generate_password_hash(json_data['password'])
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


@bp.delete('/<id>')
@bp.auth_required(auth)
@admin_access_required
def delete_user(id):
    """Delete user.

    """

    user = db.get_or_404(User, id)
    db.session.delete(user)
    db.session.commit()

    return 'Deletion successful.', 200


@bp.get('/')
@bp.output(UserOut(many=True))
@bp.auth_required(auth)
@admin_access_required
def get_users():
    """Get all users.

    """

    users = User.query.all()

    return [UserOut().dump(user) for user in users], 200


@bp.patch('/<id>')
@bp.input(UserUpdate)
@bp.output(UserOut)
@bp.auth_required(auth)
def update_user(id, json_data):
    """Update details of a user.

    """

    user = auth.current_user
    role_names = {role.name for role in auth.current_user.roles}

    if user.id != id and 'admin' not in role_names:
        abort(403, 'restricted')

    user.password_hash = generate_password_hash(json_data['new_password'])
    db.session.commit()

    return UserOut().dump(user), 200


@bp.cli.command("create")
@click.argument("username")
@click.argument("password")
@click.option("--role", default='read-only', show_default=True)
def create_user_cmd(username, password, role):
    """Create a new user

    Example:
        flask --app cads user create guest guest
    """

    role_obj = Role.query.filter_by(name=role).first()

    if role_obj is None:
        role_obj = Role(
            name=role,
            description=f"Automatically created role '{role}'",
        )
        db.session.add(role_obj)
        db.session.flush()

    if User.query.filter_by(username=username).first():
        raise click.ClickException(
            f'User "{username}" already exists.'
        )

    user = User(
        username=username,
        email=f"{username}@localhost",
        first_name=username,
        last_name=username,
        password_hash=generate_password_hash(password),
        active=True,
    )

    user.roles.append(role_obj)

    db.session.add(user)
    db.session.commit()

    click.echo(
        f'Created user "{username}" with role "{role}".'
    )
