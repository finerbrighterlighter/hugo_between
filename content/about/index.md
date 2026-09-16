+++
date = "2016-11-05T21:05:33+05:30"
title = "About"
description = "How a dentist trained in Yangon became a health-data researcher in Bangkok, and what changed along the way."
+++

## Yangon, 2012–2019

I trained as a dentist at the University of Dental Medicine, Yangon, from 2012 to 2019, and hold a general practitioner's licence in Myanmar. The final year was a house officer post at the university hospital, rotating through orthodontics, periodontology, prosthodontics, oral medicine and community dentistry.

Research came in through community dentistry. In 2017 I helped with a cross-sectional survey of oral health in Taung-Tha township, Myingyan district, and in 2018 I worked as an undergraduate research assistant in the Department of Preventive and Community Dentistry, collecting and entering data. On field trips we recorded periodontal pocket depths at six sites on every tooth for every participant. The days were long and the team still often fell short of its target sample. A better way of choosing whom to examine would have helped; we did not have one.

Research methods were not a large part of the curriculum. What I learned came from small local projects and occasional training run by Myanmar scholars who had studied abroad. On graduation a professor suggested I train overseas, and I moved to Thailand.

## Bangkok, 2019–2021

I joined the Master of Science in Data Science for Healthcare at the Faculty of Medicine Ramathibodi Hospital, Mahidol University, having barely encountered formal statistics. The programme was quantitative from the first semester and I spent the early months catching up, mostly through Stack Exchange and course forums. Debugging my own code turned out to be the most useful way to learn.

My thesis, supervised by Ammarin Thakkinstian and Anuchate Pattanateepapon, asked whether severe periodontitis could be predicted from data already collected in a prospective cardiovascular cohort, rather than from a new full-mouth examination. We compared mixed-effects logistic regression with machine-learning classifiers; the regression model performed best. The work was presented at a regional conference in 2021 and published in JMIR Formative Research in 2023.

That project is where my interest in secondary data started. Routinely collected clinical records, handled carefully, can answer questions that would otherwise need a new and expensive study.

## Ramathibodi, since 2021

Since graduating I have worked as a graduate research assistant in the Data Science and Clinical Informatics division of the Department of Clinical Epidemiology and Biostatistics. The division maintains the CEB Data Warehouse, which turns electronic medical records from routine visits since 2010 into research cohorts. I am the data manager for the hypertension and dementia cohorts, worked earlier on the abdominal-surgery warehouse, and help extend the hypertension and dementia cohorts to Siriraj and Srinagarind hospitals.

Day to day this means extracting records, standardising and harmonising them, handling missing data, and producing datasets that epidemiologists, clinicians, surgeons, pharmacists, economists and biostatisticians can analyse. Most of it is in Python, some in R, with larger jobs on an HPC cluster.

In 2023 I was a local mentor at the Thailand Health AI Datathon in Khon Kaen, run with MIT Critical Data, and prepared the hypertension dataset, the largest at the event with about 100,000 patients. The team I mentored with Michael G. Morley finished second runner-up; the teams that took the grand prize and the runner-up prize also worked on that dataset.

## What I am working on

Electronic health records capture only what one system sees. Patients are treated elsewhere, referred outside the network, move away, or simply do not come back, and none of that is recorded. Without a health information exchange these gaps censor follow-up, distort exposure–outcome estimates and weaken the calibration of prediction models outside the group of patients with complete records. My current work is on describing this loss of continuity and adjusting for it, alongside uncertainty-aware imputation for missing data in real-world datasets. The settings where such methods would matter most, including Myanmar, are the ones where records are most fragmented.
