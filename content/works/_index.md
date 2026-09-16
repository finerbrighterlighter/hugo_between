---
title: Works
layout: works
cascade:
  - target:
      kind: page
      path: /works/conference/**
    build:
      render: never
      list: always
  - target:
      kind: page
      path: /works/report/**
    build:
      render: never
      list: always
  - target:
      path: /works/**
      kind: page
    layout: work
description: "Complete record of published papers, conference work and dissertations on real-world evidence and clinical prediction."
---
