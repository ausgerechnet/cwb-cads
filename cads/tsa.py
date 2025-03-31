#! /usr/bin/env python
# -*- coding: utf-8 -*-

from datetime import datetime

import numpy as np
from pandas import DataFrame
from scipy.stats import norm
from statsmodels.gam.api import BSplines, GLMGam
from statsmodels.nonparametric.smoothers_lowess import lowess


def calculate_time_diff(time_strings, unit='minutes'):
    """
    Calculate the difference between consecutive time strings in the provided unit.

    :param time_strings: List of time strings
    :param unit: Time unit to calculate the difference ('minutes', 'hours', 'seconds', 'days', 'weeks', 'months')
    :return: List of time differences in the specified unit
    """
    # Convert time strings to datetime objects
    time_objects = [datetime.fromisoformat(time_str) for time_str in time_strings]

    # Calculate the time differences in the specified unit
    time_diffs = []
    for i in range(1, len(time_objects)):
        diff = time_objects[i] - time_objects[i-1]

        # Convert the difference to different units
        if unit == 'minutes':
            diff_value = diff.total_seconds() / 60
        elif unit == 'hours':
            diff_value = diff.total_seconds() / 3600
        elif unit == 'seconds':
            diff_value = diff.total_seconds()
        elif unit == 'days':
            diff_value = diff.days
        elif unit == 'weeks':
            diff_value = diff.days / 7
        elif unit == 'months':
            diff_value = diff.days / 30  # Approximate by assuming 30 days in a month
        else:
            raise ValueError(f"Unsupported unit '{unit}'. Choose from 'minutes', 'hours', 'seconds', 'days', 'weeks', 'months'.")

        time_diffs.append(diff_value)

    return time_diffs


def loess_smoothing(x, scores, frac=.2, n_boot=10):

    y_smoothed = lowess(scores, x, frac=frac, return_sorted=False)

    y_boots = np.zeros((n_boot, len(x)))
    for i in range(n_boot):
        sample_indices = np.random.choice(np.arange(len(x)), size=len(x), replace=True)
        y_boots[i, :] = lowess(np.array(scores)[sample_indices], np.array(x)[sample_indices], frac=frac, return_sorted=False)

    return DataFrame({
        'x': x,
        'ci_025': np.percentile(y_boots, 2.5, axis=0),
        'ci_050': np.percentile(y_boots, 5, axis=0),
        'smooth': y_smoothed,
        'ci_950': np.percentile(y_boots, 95, axis=0),
        'ci_975': np.percentile(y_boots, 97.5, axis=0)
    })


def gam_smoothing(d, df=5, degree=3):

    bs = BSplines(d[['x']], df=[df], degree=[degree])
    gam_bs = GLMGam.from_formula('score ~ x', data=d, smoother=bs)
    res_bs = gam_bs.fit()
    se_pred = res_bs.get_prediction().se

    d['smooth'] = res_bs.predict()
    d['smooth'] = d['smooth'].clip(0, 1)
    d['ci_025'] = (d['smooth'] - norm.ppf(.975) * se_pred).clip(0, 1)
    d['ci_050'] = (d['smooth'] - norm.ppf(.95) * se_pred).clip(0, 1)
    d['ci_950'] = (d['smooth'] + norm.ppf(.95) * se_pred).clip(0, 1)
    d['ci_975'] = (d['smooth'] + norm.ppf(.975) * se_pred).clip(0, 1)

    return d
