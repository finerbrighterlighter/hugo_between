+++
title = "Posts"

# HTML only. Hugo gives every section an RSS output by default, and the
# per-language [languages.en.outputs] block in hugo.toml overrides the root
# [outputs] that tried to stop it. The site publishes one feed, the works feed
# at /index.xml, built by layouts/index.xml.
outputs = ["HTML"]

# Only publish bundle resources that a template actually references
# (Permalink/RelPermalink); raw multi-MB originals stay out of public/.
[[cascade]]
  [cascade.build]
    publishResources = false
  [cascade.target]
    path = "/posts/**"
    kind = "page"
description = "Notes on health data work: methods that did not survive contact with real records, talks given, and things learned late."
+++
