"""
For Flask API data validation.
Contains data models for the Endpoint validation
"""


LOGIN_SCHEMA = {
    'type': 'object',
    'properties': {
        'username': {'type': 'string', 'maxLength': 255},
        'password': {'type': 'string', 'maxLength': 255},
    },
    'required': ['username', 'password']
}

PASSWORD_SCHEMA = {
    'type': 'object',
    'properties': {
        'password': {'type': 'string', 'minLength': 8, 'maxLength': 255}
    },
    'required': ['password']
}

USER_SCHEMA = {
    'type': 'object',
    'properties': {
        'username': {'type': 'string', 'maxLength': 255},
        'password': {'type': 'string', 'minLength': 8, 'maxLength': 255},
        'last_name': {'type': 'string', 'maxLength': 255},
        'first_name': {'type': 'string', 'maxLength': 255},
        'email': {'type': 'string', 'format': 'email'},
        'roles': {
            'type': 'array',
            'items': {
                'type': 'string', 'maxLength': 255
            }
        }
    },
    'required': ['username', 'password', 'last_name', 'first_name', 'email']
}

USER_UPDATE_SCHEMA = {
    'type': 'object',
    'properties': {
        'last_name': {'type': 'string', 'maxLength': 255},
        'first_name': {'type': 'string', 'maxLength': 255},
        'email': {'type': 'string', 'format': 'email'}
    },
    'required': ['last_name', 'first_name', 'email']
}

COLLOCATION_SCHEMA = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string', 'maxLength': 255},
        'corpus': {'type': 'string', 'maxLength': 255},
        'window_size': {'type': 'number', 'minimum': 3, 'maximum': 20},
        's_break': {'type': 'string', 'maxLength': 255},
        'p_query': {'type': 'string', 'maxLength': 255},
        'items': {
            'type': 'array',
            'items': {
                'type': 'string', 'maxLength': 255
            }
        }
    },
    'required': ['name', 'corpus', 'items', 's_break', 'p_query']
}

UPDATE_SCHEMA = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string', 'maxLength': 255},
        'window_size': {'type': 'number', 'minimum': 3, 'maximum': 20},
        's_break': {'type': 'string', 'maxLength': 255},
        'p_query': {'type': 'string', 'maxLength': 255},
    },
    'required': ['name']
}

DISCOURSEME_SCHEMA = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string', 'maxLength': 255},
        'items': {
            'type': 'array',
            'items': {
                'type': 'string', 'maxLength': 255
            }
        }
    },
    'required': ['name', 'items']
}

CONSTELLATION_SCHEMA = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string', 'maxLength': 255},
        'discoursemes': {
            'type': 'array',
            'items': {
                'type': 'number', 'minimum': 0
            }
        }
    },
    'required': ['name']
}

CONSTELLATION_UPDATE_SCHEMA = {
    'type': 'object',
    'properties': {
        'name': {'type': 'string', 'maxLength': 255},
    },
    'required': ['name']
}
