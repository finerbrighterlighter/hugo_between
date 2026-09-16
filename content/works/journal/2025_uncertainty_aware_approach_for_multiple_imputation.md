---
title: "Uncertainty Aware Approach for Multiple Imputation Using Conventional and Machine Learning Models: A Real-World Data Study"
date: 2025-04-17
type: journal
venue: "Journal of Big Data"

authors:
- id: romen
- id: panu
- id: suphachoke
- id: me-ceb
  highlight: true
- id: wanchana
- id: mckay
- id: attia
- id: anuchate
- id: anupol
- id: ammarin

scholar: W7OEmFMy1HYC

sources:
- text: fulltext
  url: https://doi.org/10.1186/s40537-025-01136-3

- text: mirror
  url: /docs/2025_Uncertainty-aware approach for multiple imputation using conventional and machine learning models a real-world data study.pdf

conditions:
- Hypertension
- Atrial Fibrillation

datasource:
- Thailand
- Ramathibodi Hospital
- CEB Data Warehouse
- Srinagarind Hospital
- Electronic Health Records

methods:
- Imputation
- Validation
- Methodology
- Statistics
- Logistic Regression
- Machine Learning
- Decision Tree
- Random Forest
- XGBoost
---

Missing data poses a significant challenge in clinical real-world studies, often arising from unplanned data collection, misplacement, patient loss to follow-up, and other factors. While multiple imputation by chained equations (MICE) is a widely used method, its sequential nature introduces uncertainty, potentially impacting prediction model performance. We proposed and evaluated three uncertainty-aware functions (uncertainty sampling, probability of improvement, and expected improvement) integrated with linear regression, decision tree, random forest, and XGBoost using three large datasets: chronic kidney disease (CKD, n = 31,043), hypertension cohort from Ramathibodi Hospital (HT-RAMA, n = 140,047) and Khon Kaen University Hospital (HT-KKU, n = 108,942) with high missing rates. In the CKD cohort, uncertainty-aware models significantly improved performance over standard MICE, except for XGBoost. LinearReg-EI performed best (RMSE 0.12, MAE 0.36). In HT-RAMA, LinearReg-US performed best (RMSE 0.24, MAE 8.15), and similarly in HT-KKU (RMSE 0.98, MAE 12.00). Uncertainty-aware models produced imputed distributions closely resembling the original data, unlike standard MICE. Our findings suggest that incorporating uncertainty functions can improve MICE, particularly for linear regression, random forest, and decision tree models.