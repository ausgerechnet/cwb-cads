import numpy as np
from pandas import DataFrame
from statsmodels.nonparametric.smoothers_lowess import lowess
from datetime import datetime


def loess_smoothing(x, scores, frac=.2, n_boot=100):

    # x = np.array([(d - min(dates)).total_seconds() for d in dates])
    y_smoothed = lowess(scores, x, frac=frac, return_sorted=False)

    y_boots = np.zeros((n_boot, len(x)))
    for i in range(n_boot):
        sample_indices = np.random.choice(np.arange(len(x)), size=len(x), replace=True)
        y_boots[i, :] = lowess(np.array(scores)[sample_indices], x[sample_indices], frac=frac, return_sorted=False)

    return DataFrame({
        'x': x,
        'ci_025': np.percentile(y_boots, 2.5, axis=0),
        'ci_050': np.percentile(y_boots, 5, axis=0),
        'smooth': y_smoothed,
        'ci_950': np.percentile(y_boots, 95, axis=0),
        'ci_975': np.percentile(y_boots, 97.5, axis=0)
    })


x = np.array([
    1, 2, 3, 4, 5, 6, 7
])
scores = np.array([1.0, 911.2, 971.4, 981.8, 992.0, 992.1, 992.5])

loess_smoothing(x, scores)
