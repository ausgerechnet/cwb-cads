#!/usr/bin/python3
# -*- coding: utf-8 -*-

from functools import wraps
from timeit import default_timer


def time_it(func):
    """
    decorator for printing the execution time of a function call
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = default_timer()
        result = func(*args, **kwargs)
        end = default_timer()
        name = func.__name__
        print(f"{name} took {round(end - start, 2)} seconds")
        return result
    return wrapper
