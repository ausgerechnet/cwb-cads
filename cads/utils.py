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
