---
title: Works
# HTML only. Hugo gives every section an RSS output by default, and the
# per-language [languages.en.outputs] block in hugo.toml overrides the
# root [outputs] that tried to stop it. The default template has nothing
# to summarise here, so the feed was bare titles. The works feed lives at
# /index.xml and is built by layouts/index.xml.
outputs: ["HTML"]
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
