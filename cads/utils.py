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


AMS_DICT = {
    # preferred: LRC
    'conservative_log_ratio': 'Conservative LR',
    # frequencies
    'O11': 'obs.',
    'E11': 'exp.',
    'ipm': 'IPM (obs.)',
    'ipm_expected': 'IPM (exp.)',
    # asymptotic hypothesis tests
    'log_likelihood': 'LLR',
    'z_score': 'z-score',
    't_score': 't-score',
    'simple_ll': 'simple LL',
    # point estimates of association strength
    'dice': 'Dice',
    'log_ratio': 'log-ratio',
    'min_sensitivity': 'min. sensitivity',
    'liddell': 'Liddell',
    # information theory
    'mutual_information': 'MI',
    'local_mutual_information': 'local MI',
}
