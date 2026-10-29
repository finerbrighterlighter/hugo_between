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

## The problem

Hospital records are not collected for research. Tests are not ordered at every visit, patients move to other hospitals, and values go into the wrong field. In our cohorts, nearly half of some key laboratory values were missing.

| Cohort | Patients | Missing data per variable |
| --- | --- | --- |
| Chronic kidney disease, Ramathibodi (CKD) | 31,043 | 4.16% to 49.01% |
| Hypertension, Ramathibodi (HT-RAMA) | 140,047 | 15.75% to 53.32% |
| Hypertension, Khon Kaen University (HT-KKU) | 108,942 | 28.20% to 67.88% |

Lipids were the worst. In HT-KKU, LDL was missing in 67.33% of patients and HDL in 67.88%.

Multiple imputation by chained equations (MICE) is the usual answer. MICE fills one variable at a time, and each model uses the values that earlier models filled. An error in an early step therefore moves into every later step.

## What we changed in MICE

We kept the MICE loop and changed the training data of each model. After the first imputed dataset, an uncertainty function scores each patient. The score shows how much that patient's imputed values vary across the imputed datasets. Each model then trains only on the patients that the function selects.

We tested three uncertainty functions:

| Function | Which patients it selects |
| --- | --- |
| Uncertainty sampling (US) | Patients with the lowest variance across imputations, so noisy samples stay out of training |
| Probability of improvement (PI) | Patients with the highest probability to improve on the current best imputed value |
| Expected improvement (EI) | Patients with the largest expected size of that improvement |

We combined each function with four models: linear regression, decision tree, random forest and XGBoost. Each run made five imputed datasets with up to 50 iterations each. An early-stopping rule ended a run when the change between iterations stayed below 1 × 10⁻⁵ for five iterations. We clipped imputed values to clinically plausible ranges, and pooled the five datasets with Rubin's rules.

## How we tested it

A real missing value has no known true value, so we made our own missing values. We took the 8,156 CKD patients with complete records. We then removed values from them in the same patterns as the real data, and imputed them again. The CKD data had 296 missing patterns. We kept the 16 patterns that covered at least 1% of patients. We then compared each imputed value with the true value.

## What we found

In the CKD cohort, the uncertainty functions improved every model over plain MICE, except XGBoost. Linear regression gave the lowest errors in all three cohorts.

| Cohort | Best model | RMSE | MAE |
| --- | --- | --- | --- |
| CKD | Linear regression + EI | 0.12 | 0.36 |
| HT-RAMA | Linear regression + US | 0.24 | 8.15 |
| HT-KKU | Linear regression + US | 0.98 | 12.00 |

In CKD, plain linear regression MICE had an RMSE of 0.168 and an MAE of 0.469. With EI, these fell to 0.115 and 0.361. For the decision tree, EI cut the RMSE about in half, from 0.443 to 0.213.

The imputed distributions also matter. With an uncertainty function, the imputed values had a shape close to the observed data. Plain MICE gave distributions that moved away from the true data.

XGBoost was the exception. The uncertainty functions did not improve it, and it needed long hyperparameter tuning. The paper recommends linear regression with EI as the default choice.

## The package

The package `uncertainty-imputation` makes this method usable on your own data. It records the uncertainty score for each imputed cell as an "acquisition score". Your code can use that score to weight, rank or audit single imputations.

| Paper | Package key |
| --- | --- |
| Uncertainty sampling | `us` |
| Probability of improvement | `pi` |
| Expected improvement | `ei` |

The package has a scikit-learn style API and accepts pandas DataFrames and NumPy arrays. It also has an amputation module that makes MCAR, MAR or MNAR missingness, so you can repeat the test design above on your own complete data.

### Install

```bash
pip install uncertainty-imputation
pip install 'uncertainty-imputation[xgboost]'   # adds the XGBoost model
```

The package needs Python 3.9 or later.

### Quick start

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
- Paper (open access): [Journal of Big Data, 2025](https://doi.org/10.1186/s40537-025-01136-3)
