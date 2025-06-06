#!/usr/bin/python3
# -*- coding: utf-8 -*-

from functools import wraps
from math import log, isnan, exp
from timeit import default_timer


def scaled_sigmoid(score, score_max, k=1):

    if score_max == 0:
        return 0
    # midpoint = score_max / 2
    midpoint = 0
    scale = score_max / 5
    x = (score - midpoint) / scale

    return 2 / (1 + exp(-k * x)) - 1


def scale_score(score, score_max, method='sigmoid', logarithmic=False, sigmoid_k=1):
    """
    Scale a score either linearly or with a generalized sigmoid.

    Parameters:
        score (float): Input score.
        score_max (float): Maximum reference value (must be > 0).
        method (str): 'linear' or 'sigmoid'.
        logarithmic (bool): Apply log transform before scaling.
        sigmoid_k (float): Steepness parameter for sigmoid (only used for 'sigmoid').

    Returns:
        float: Scaled score in range [-1, 1] (sigmoid bounded), or linearly scaled.
    """
    if isnan(score_max) or score_max == 0:
        score_max = 1

    if score == 0:
        return 0

    sgn = -1 if score < 0 else +1

    score = abs(score)
    score_max = abs(score_max)

    if logarithmic:
        score = log(score)
        score_max = log(score_max)

    if method == 'linear':
        return sgn * (score / score_max)

    elif method == 'sigmoid':
        return sgn * scaled_sigmoid(score, score_max)

    else:
        raise ValueError(f"Unknown method: {method}")


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


def paginate_dataframe(df, sort_by, sort_order, page_number, page_size):
    """paginate a pandas DataFrame.

    """

    # sort DataFrame
    if sort_order not in ['ascending', 'descending']:
        raise ValueError()
    ascending = sort_order == "ascending"
    df_sorted = df.sort_values(by=sort_by, ascending=ascending)

    # get total records and pages
    total_records = len(df_sorted)
    total_pages = (total_records + page_size - 1) // page_size  # ceil(total_records / page_size)

    # slice DataFrame for pagination
    start_idx = (page_number - 1) * page_size
    end_idx = start_idx + page_size
    df_paginated = df_sorted.iloc[start_idx:end_idx]

    # pagination metadata
    metadata = {
        "total": total_records,
        "pages": total_pages,
        "page_number": page_number,
        "page_size": page_size,
    }

    return df_paginated, metadata


def translate_flags(ignore_case, ignore_diacritics):
    """translate boolean flags into one string (%cd)

    TODO move to cwb-ccc

    """
    flags = ''
    if ignore_case or ignore_diacritics:
        flags = '%'
        if ignore_case:
            flags += 'c'
        if ignore_diacritics:
            flags += 'd'
    return flags


AMS_DICT = {
    # raw frequencies
    'O11': 'freq.',
    'E11': 'exp. freq.',
    'ipm': 'IPM',
    'ipm_expected': 'exp. IPM',
    # preferred: LRC
    'conservative_log_ratio': 'LRC',
    # asymptotic hypothesis tests
    'log_likelihood': 'LLR',
    'z_score': 'z-score',
    't_score': 't-score',
    'simple_ll': 'simple LLR',
    # point estimates of association strength
    'dice': 'Dice',
    'log_ratio': 'log-ratio',
    'min_sensitivity': 'MS',
    'liddell': 'Liddell',
    # information theory
    'mutual_information': 'MI',
    'local_mutual_information': 'local MI',
}


AMS_CUTOFF = {
    'conservative_log_ratio': 0,
    'log_likelihood': 10.83,
}
