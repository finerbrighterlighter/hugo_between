---
draft: true
title: "Paper Title"
date: 2024-01-15        # publication date
type: journal
venue: "Journal Name"

authors:
  - id: me-ceb
    highlight: true     # bolds name in author list
  - id: collaborator-id
  # - given: First      # use inline given/family if no id in researchers.yml
  #   family: Last

# Google Scholar citation_for_view suffix (from the scholar.google.com citation URL)
scholar: "AbCdEfGhIjK"

sources:
  - text: pubmed        # button label is uppercased: PUBMED
    url: https://pubmed.ncbi.nlm.nih.gov/XXXXXXXX/
  - text: fulltext      # use doi.org URL — required for CITE panel to fetch BibTeX
    url: https://doi.org/10.XXXX/XXXXX
  - text: mirror        # internal PDF — gets relURL, opens in same tab
    url: /docs/YYYY_Title.pdf
  # - text: custom-key  # any key becomes a button automatically
  #   url: https://...

conditions:
  - Condition Name

datasource:
  - Country or Dataset Name

methods:
  - Method Name

# icon: fas fa-file-alt  # optional Font Awesome icon; this is the default
---

Abstract text here.
