---
title: "Uncertainty-aware imputation is now a Python package"
date: 2026-10-29
url: "/posts/261029-uncertainty-imputation-package"
description: "The method from our 2025 Journal of Big Data paper is now on PyPI as uncertainty-imputation."
company: "Software release"
math: false
---

The method from our paper [Uncertainty Aware Approach for Multiple Imputation Using Conventional and Machine Learning Models]({{< relref "works/journal/2025_uncertainty_aware_approach_for_multiple_imputation.md" >}}) is now a Python package. Romen Samuel Rodis Wabina, the first author of the paper, wrote and maintains it.

<!--more-->

## What the package does

The package imputes missing values in tabular data in iterations, like MICE. At each step, it trains a model that knows its own uncertainty. It then records an acquisition score for each imputed cell. Your code can use that score to weight, rank or audit single imputations.

| Acquisition function | Key |
| --- | --- |
| Uncertainty sampling | `us` |
| Probability of improvement | `pi` |
| Expected improvement | `ei` |

The package has a scikit-learn style API and accepts pandas DataFrames and NumPy arrays. It also has an amputation module that makes MCAR, MAR or MNAR missingness for controlled tests.

## Install

```bash
pip install uncertainty-imputation
pip install 'uncertainty-imputation[xgboost]'   # adds the XGBoost model
```

The package needs Python 3.9 or later.

## Quick start

```python
import numpy as np
import pandas as pd
from uncertainty_imputation import UncertaintyImputer, MCARAmputer

X_true = pd.DataFrame(np.random.default_rng(0).normal(size=(300, 4)),
                      columns=["a", "b", "c", "d"])
X_missing = MCARAmputer(missing_rate=0.25, random_state=0).ampute(X_true)

imputer = UncertaintyImputer(model="random_forest", acquisition="ei",
                             max_iter=10, random_state=42)
X_imputed = imputer.fit_transform(X_missing)

for col, scores in imputer.uncertainty_.items():
    print(col, scores.mean())
```

## Links

- PyPI: [uncertainty-imputation](https://pypi.org/project/uncertainty-imputation/)
- Source code and issues: [rrwabina/uncertainty-imputation](https://github.com/rrwabina/uncertainty-imputation)
- Paper: [Journal of Big Data, 2025](https://doi.org/10.1186/s40537-025-01136-3)
