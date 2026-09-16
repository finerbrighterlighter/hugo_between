#!/usr/bin/env python3
"""
Build CV PDF from YAML data and Hugo works pages.

USAGE
-----
  conda run -n hugo python scripts/build_cv.py

Run this after any change to:
  - data/cv.yml              (personal info, education, experience, awards)
  - content/works/journal/   (new or edited journal publications)
  - content/works/preprint/  (new or edited preprints)
  - content/works/conference/ (new or edited conference entries)

OUTPUT
------
  static/general/cv/cv_htunteza_YYYYMMDD.pdf   dated archive
  static/general/cv/cv_htunteza.pdf            always-current; sidebar links here

The 3 most recent dated files are kept; older ones are deleted automatically.
Commit both files after running so the website picks up the new PDF.

IF THE CONDA ENVIRONMENT DOES NOT EXIST
----------------------------------------
  conda create -n hugo python=3.11
  conda run -n hugo pip install weasyprint pyyaml

WeasyPrint also needs system libraries for font/layout rendering.
On Ubuntu/Debian:
  sudo apt-get install libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
                       libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
On Arch:
  sudo pacman -S cairo pango gdk-pixbuf2 libffi

DATA SOURCES
------------
  data/cv.yml          — all stable personal data (read by this script)
  content/works/       — Hugo front matter parsed for publications/conferences
  data/homepage.yml    — drives the website only; NOT read by this script

BIBTEX CACHE
------------
  scripts/.bibtex_cache.json — local cache of doi.org BibTeX responses.
  Delete this file to force a full re-fetch of all BibTeX data.
"""

import json
import re
import shutil
import time
import urllib.error
import urllib.request
import yaml
from datetime import datetime
from pathlib import Path
from weasyprint import HTML

# Resolve paths relative to the repo root (one level above scripts/)
ROOT         = Path(__file__).parent.parent
DATA         = ROOT / "data"
WORKS        = ROOT / "content" / "works"
CV_DIR       = ROOT / "static" / "general" / "cv"
BIBTEX_CACHE = Path(__file__).parent / ".bibtex_cache.json"

# How many authors to list before truncating.
# When total > NLM_AUTHOR_LIMIT, shows first N, "...", then last author.
NLM_AUTHOR_LIMIT = 10


def load_yaml(path):
    with open(path) as f:
        return yaml.safe_load(f)


def load_works(section):
    """Read all .md files in content/works/<section>/ and return their front matter.

    Files that don't start with '---' (no front matter) are skipped.
    Results are sorted newest-first by the 'date' field.
    """
    pages = []
    for md in (WORKS / section).glob("*.md"):
        text = md.read_text()
        if text.startswith("---"):
            raw = text.split("---", 2)[1]
            fm = yaml.safe_load(raw)
            if fm and not fm.get("draft"):
                pages.append(fm)
    pages.sort(key=lambda x: str(x.get("date", "")), reverse=True)
    return pages


def load_researcher_map():
    """Build a flat {id: {given, family, ...}} dict from data/researchers.yml."""
    rm = {}
    for p in load_yaml(DATA / "researchers.yml"):
        if p.get("id"):
            rm[p["id"]] = p
    return rm


_RESEARCHER_MAP = None


def get_researcher_map():
    global _RESEARCHER_MAP
    if _RESEARCHER_MAP is None:
        _RESEARCHER_MAP = load_researcher_map()
    return _RESEARCHER_MAP


# ── BibTeX fetch + cache ───────────────────────────────────────────────────────

_BIBTEX_CACHE = None


def _load_bibtex_cache():
    if BIBTEX_CACHE.exists():
        with open(BIBTEX_CACHE) as f:
            return json.load(f)
    return {}


def _save_bibtex_cache():
    with open(BIBTEX_CACHE, "w") as f:
        json.dump(_BIBTEX_CACHE, f, indent=2)


def get_bibtex(doi):
    """Return BibTeX string for a DOI, fetching from doi.org if not cached.

    Caches results in scripts/.bibtex_cache.json so repeat builds are instant.
    Returns None if the fetch fails.
    """
    global _BIBTEX_CACHE
    if _BIBTEX_CACHE is None:
        _BIBTEX_CACHE = _load_bibtex_cache()

    if doi in _BIBTEX_CACHE:
        return _BIBTEX_CACHE[doi]

    url = f"https://doi.org/{doi}"
    req = urllib.request.Request(url, headers={
        "Accept":     "application/x-bibtex",
        "User-Agent": "build_cv.py/1.0 (mailto:kohtunteza@gmail.com)",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            bibtex = resp.read().decode("utf-8")
        print(f"  Fetched BibTeX: {doi}")
        _BIBTEX_CACHE[doi] = bibtex
        _save_bibtex_cache()
        time.sleep(0.5)   # polite pause between doi.org requests
        return bibtex
    except Exception as exc:
        print(f"  Warning: BibTeX fetch failed for {doi}: {exc}")
        return None


# ── BibTeX parsing ─────────────────────────────────────────────────────────────

def _bib_field(bibtex, field):
    """Extract a single field value from a BibTeX string. Returns str or None."""
    # Handles: field = {value}, field = "value", field = bare_word
    p1 = rf'\b{field}\s*=\s*\{{((?:[^{{}}]|\{{[^{{}}]*\}})*)\}}'
    m = re.search(p1, bibtex, re.IGNORECASE | re.DOTALL)
    if m:
        return m.group(1).strip()
    p2 = rf'\b{field}\s*=\s*"([^"]*)"'
    m = re.search(p2, bibtex, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    p3 = rf'\b{field}\s*=\s*(\w+)'
    m = re.search(p3, bibtex, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return None


def _bib_authors(bibtex):
    """Return list of raw author strings from a BibTeX entry."""
    m = re.search(
        r'\bauthor\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}',
        bibtex, re.IGNORECASE | re.DOTALL
    )
    if not m:
        m = re.search(r'\bauthor\s*=\s*"([^"]*)"', bibtex, re.IGNORECASE)
    if not m:
        return []
    return [a.strip() for a in re.split(r'\s+and\s+', m.group(1), flags=re.IGNORECASE)]


def _clean_bib(s):
    """Strip LaTeX brace groups: {COVID-19} → COVID-19."""
    return re.sub(r'\{([^{}]*)\}', r'\1', s).strip()


def _fmt_author_nlm(raw):
    """Format one BibTeX author string as 'Last FM' (NLM style)."""
    raw = _clean_bib(raw)
    if ',' in raw:
        last, rest = raw.split(',', 1)
        firsts = [w for w in rest.split() if w]
        initials = ''.join(f[0].upper() for f in firsts)
        return f"{last.strip()} {initials}".strip()
    parts = raw.split()
    if not parts:
        return raw
    last     = parts[-1]
    initials = ''.join(p[0].upper() for p in parts[:-1] if p)
    return f"{last} {initials}".strip()


# ── Citation formatters ────────────────────────────────────────────────────────

def get_doi(sources):
    """Return bare DOI string (no resolver prefix) from a sources list, or None."""
    for s in sources or []:
        url = s.get("url", "")
        if "doi.org" in url:
            return url.replace("https://doi.org/", "").replace("http://doi.org/", "")
    return None


def doi_link(sources):
    """Return an HTML <a> tag for the first DOI found in a sources list, or ''."""
    for s in sources or []:
        url = s.get("url", "")
        if "doi.org" in url:
            short = url.replace("https://doi.org/", "").replace("http://doi.org/", "")
            return f'<a href="{url}">{short}</a>'
    return ""


def fmt_nlm_citation(p, bibtex):
    """Build a full NLM-style citation using BibTeX data + front matter.

    Authors come from BibTeX (NLM format, up to NLM_AUTHOR_LIMIT then et al.).
    Journal name comes from front matter `venue` (user-controlled abbreviation).
    Volume/issue/pages come from BibTeX.
    The author matching highlight:true in front matter is bolded by position.
    """
    # Find which position should be highlighted (0-indexed)
    highlight_idx = next(
        (i for i, a in enumerate(p.get("authors", [])) if a.get("highlight")),
        None,
    )

    # Format authors: NLM Last FM, up to NLM_AUTHOR_LIMIT then et al.
    raw_authors = _bib_authors(bibtex)
    formatted   = [_fmt_author_nlm(a) for a in raw_authors]
    if len(formatted) > NLM_AUTHOR_LIMIT:
        shown  = formatted[:NLM_AUTHOR_LIMIT]
        suffix = ", et al."
    else:
        shown  = list(formatted)
        suffix = "."

    if highlight_idx is not None and highlight_idx < len(shown):
        shown[highlight_idx] = f"<b>{shown[highlight_idx]}</b>"

    author_str = ", ".join(shown) + suffix

    # Core fields
    title = p.get("title", "")
    venue = p.get("venue", "")          # front matter controls journal abbreviation
    year  = str(p.get("date", ""))[:4]

    # Volume / issue / pages from BibTeX
    vol   = _bib_field(bibtex, "volume")
    num   = _bib_field(bibtex, "number")
    pages = _bib_field(bibtex, "pages")
    if pages:
        pages = re.sub(r'--?', '-', pages)

    # Assemble
    cite = f"{author_str} {title}. <i>{venue}</i>. {year}"
    if vol:
        cite += f";{vol}"
    if num:
        cite += f"({num})"
    if pages:
        cite += f":{pages}"
    cite += "."
    doi_html = doi_link(p.get("sources"))
    if doi_html:
        cite += f" doi: {doi_html}"
    return cite


def fmt_authors_fallback(authors):
    """Fallback author formatter (front matter only, no BibTeX).

    Used when doi.org fetch fails. Produces 'Family I, Family I, ...'
    with bolded highlights — same as the original fmt_authors logic.
    """
    rm = get_researcher_map()
    parts = []
    for a in authors:
        if a.get("id"):
            person = rm.get(a["id"], {})
            given  = person.get("given", a.get("given", ""))
            family = person.get("family", a.get("family", ""))
        else:
            given  = a.get("given", "")
            family = a.get("family", "")
        name = f"{family} {given[0]}" if given else family
        parts.append(f"<b>{name}</b>" if a.get("highlight") else name)
    return ", ".join(parts)


def _pub_cite(p):
    """Return HTML citation string for a publication page (journal or preprint)."""
    doi_val = get_doi(p.get("sources"))
    bibtex  = get_bibtex(doi_val) if doi_val else None

    if bibtex:
        return fmt_nlm_citation(p, bibtex)

    # Fallback: no BibTeX available
    authors  = fmt_authors_fallback(p.get("authors", []))
    doi_html = doi_link(p.get("sources"))
    cite     = f'{authors} {p["title"]}. <i>{p.get("venue", "")}</i>.'
    if doi_html:
        cite += f" doi: {doi_html}"
    return cite


def _render_bullet(b):
    """Render a single bullet, which may be a plain string or a dict with links.

    Plain string:
        "Some bullet text"

    Dict with optional sub-links (shown as small muted text below the bullet):
        text: "Some bullet text"
        links:
          - {label: "Display name", url: "https://..."}
    """
    if isinstance(b, str):
        return f"<li>{b}</li>"
    text  = b["text"]
    links = b.get("links", [])
    link_html = " &nbsp;·&nbsp; ".join(
        f'<a href="{l["url"]}">{l["label"]}</a>' for l in links
    )
    suffix = f'<span class="bullet-links">{link_html}</span>' if link_html else ""
    return f"<li>{text}{suffix}</li>"


def _render_bullet_md(b):
    if isinstance(b, str):
        return f"- {b}"
    text  = b["text"]
    links = b.get("links", [])
    link_md = " · ".join(f'[{l["label"]}]({l["url"]})' for l in links)
    return f"- {text}" + (f"  \n  {link_md}" if link_md else "")


# ── Markdown citation helpers ──────────────────────────────────────────────────

def doi_md(sources):
    """Return a markdown link for the first DOI in sources, or ''."""
    for s in sources or []:
        url = s.get("url", "")
        if "doi.org" in url:
            short = url.replace("https://doi.org/", "").replace("http://doi.org/", "")
            return f"[{short}]({url})"
    return ""


def fmt_nlm_citation_md(p, bibtex):
    """NLM citation as plain Markdown (bold via **, italic via _, links via []()), ."""
    highlight_idx = next(
        (i for i, a in enumerate(p.get("authors", [])) if a.get("highlight")),
        None,
    )
    raw_authors = _bib_authors(bibtex)
    formatted   = [_fmt_author_nlm(a) for a in raw_authors]
    if len(formatted) > NLM_AUTHOR_LIMIT:
        shown  = formatted[:NLM_AUTHOR_LIMIT]
        suffix = ", et al."
    else:
        shown  = list(formatted)
        suffix = "."

    if highlight_idx is not None and highlight_idx < len(shown):
        shown[highlight_idx] = f"**{shown[highlight_idx]}**"

    author_str = ", ".join(shown) + suffix
    title = p.get("title", "")
    venue = p.get("venue", "")
    year  = str(p.get("date", ""))[:4]
    vol   = _bib_field(bibtex, "volume")
    num   = _bib_field(bibtex, "number")
    pages = _bib_field(bibtex, "pages")
    if pages:
        pages = re.sub(r'--?', '-', pages)

    cite = f"{author_str} {title}. _{venue}_. {year}"
    if vol:
        cite += f";{vol}"
    if num:
        cite += f"({num})"
    if pages:
        cite += f":{pages}"
    cite += "."
    d = doi_md(p.get("sources"))
    if d:
        cite += f" doi: {d}"
    return cite


def fmt_authors_fallback_md(authors):
    rm = get_researcher_map()
    parts = []
    for a in authors:
        if a.get("id"):
            person = rm.get(a["id"], {})
            given  = person.get("given", a.get("given", ""))
            family = person.get("family", a.get("family", ""))
        else:
            given  = a.get("given", "")
            family = a.get("family", "")
        name = f"{family} {given[0]}" if given else family
        parts.append(f"**{name}**" if a.get("highlight") else name)
    return ", ".join(parts)


def _pub_cite_md(p):
    doi_val = get_doi(p.get("sources"))
    bibtex  = get_bibtex(doi_val) if doi_val else None
    if bibtex:
        return fmt_nlm_citation_md(p, bibtex)
    authors  = fmt_authors_fallback_md(p.get("authors", []))
    d        = doi_md(p.get("sources"))
    cite     = f'{authors} {p["title"]}. _{p.get("venue", "")}_.'
    if d:
        cite += f" doi: {d}"
    return cite


# ── Markdown assembler ─────────────────────────────────────────────────────────

def build_markdown(cv, generated_date):
    contact = cv["contact"]
    contact_parts = []
    if cv.get("show_phone_number", True):
        contact_parts.append(contact["phone"])
    contact_parts += [contact["email"], contact["website"]]
    lines = []

    # Header
    lines += [
        f"# {cv['header']['name'].upper()}",
        "",
        cv['header']['address'],
        "",
        " · ".join(contact_parts),
        "",
        f"Generated: {generated_date}",
        "",
        "---",
        "",
    ]

    # Research Interests
    lines += [
        "## Research Interests",
        "",
        "; ".join(cv["research_interests"]),
        "",
        "---",
        "",
    ]

    # Education
    lines += ["## Education", ""]
    for e in cv["education"]:
        lines.append(f"**{e['time']}** | {e['university']}")
        if cv.get("show_qs_rankings", True) and e.get("ranking"):
            lines.append(f"_{e['ranking']}_")
        lines.append(f"**{e['degree']}** — {e['field']}")
        if e.get("thesis"):
            lines.append(f"Thesis: {e['thesis']}")
        if e.get("note"):
            lines.append(e["note"])
        lines.append("")
    lines += ["---", ""]

    # Work Experience
    lines += ["## Work Experience", ""]
    for e in cv["work_experience"]:
        lines.append(f"**{e['time']}** | {e['institution']}")
        lines.append(f"**{e['role']}**")
        for b in e.get("bullets", []):
            lines.append(_render_bullet_md(b))
        lines.append("")
    lines += ["---", ""]

    # Awards
    lines += ["## Awards", ""]
    for a in cv["awards"]:
        lines.append(f"**{a['year']}** | {a['title']}  ")
        lines.append(f"_{a['institution']}_")
        lines.append("")
    lines += ["---", ""]

    # Additional Relevant Experiences
    lines += ["## Additional Relevant Experiences", ""]
    for e in cv["additional_experiences"]:
        lines.append(f"**{e['institution']}**")
        lines.append(f"_{e['title']}_")
        for b in e.get("bullets", []):
            lines.append(f"- {b}")
        lines.append("")
    lines += ["---", ""]

    # Publications
    lines += ["## Publications", ""]
    journals  = load_works("journal")
    preprints = load_works("preprint")
    print("Building Markdown publications…")
    for i, p in enumerate(journals, 1):
        lines.append(f"{i}. {_pub_cite_md(p)}")
    if preprints:
        lines += ["", "### Preprints and Under Review", ""]
        for i, p in enumerate(preprints, 1):
            lines.append(f"{i}. {_pub_cite_md(p)}")
    lines += ["", "---", ""]

    # Conferences
    conferences = load_works("conference")
    type_label  = {
        "conference-speaking":   "Speaker",
        "conference-poster":     "Poster",
        "conference-proceeding": "Proceeding",
    }
    lines += ["## Conferences", ""]
    for c in conferences:
        year  = str(c.get("date", ""))[:4]
        label = type_label.get(c.get("type", ""), "")
        tag   = f" · {label}" if label else ""
        lines.append(f"**{year}**{tag}  ")
        lines.append(f"{c['title']}  ")
        lines.append(f"_{c.get('venue', '')}_")
        lines.append("")

    return "\n".join(lines)


def row(left, right, cls=""):
    """Wrap left/right content in the two-column flex row used throughout the CV."""
    c = f' {cls}' if cls else ''
    return f'<div class="row{c}"><div class="col-l">{left}</div><div class="col-r">{right}</div></div>'


def section(title, content):
    """Wrap content in a <section> with an uppercase tracked heading."""
    return f'<section><h2>{title}</h2>{content}</section>'


def build_html(cv):
    """Assemble the full HTML document from the cv dict and works pages."""
    contact = cv["contact"]
    contact_parts = []
    if cv.get("show_phone_number", True):
        contact_parts.append(contact["phone"])
    contact_parts += [
        f'<a href="mailto:{contact["email"]}">{contact["email"]}</a>',
        f'<a href="{contact["website"]}">{contact["website"]}</a>',
    ]
    contact_html = " &nbsp;&middot;&nbsp; ".join(contact_parts)

    # ── Header ──────────────────────────────────────────────────────────────
    header = f"""<header>
      <h1>{cv['header']['name'].upper()}</h1>
      <p class="address">{cv['header']['address']}</p>
      <p class="contact">
        {contact_html}
      </p>
    </header>"""

    # ── Research Interests ───────────────────────────────────────────────────
    interests = section("Research Interests",
        row("", "; ".join(cv["research_interests"])))

    # ── Education ────────────────────────────────────────────────────────────
    edu_rows = ""
    for e in cv["education"]:
        left  = f'<span class="date">{e["time"]}</span>'
        left += f'<br><span class="inst">{e["university"]}</span>'
        if cv.get("show_qs_rankings", True) and e.get("ranking"):
            left += f'<br><span class="meta">{e["ranking"]}</span>'

        right  = f'<span class="role">{e["degree"]}</span>'
        right += f'<br><span class="field">{e["field"]}</span>'
        if e.get("thesis"):
            right += f'<br><span class="detail">Thesis: {e["thesis"]}</span>'
        if e.get("note"):
            right += f'<br><span class="detail">{e["note"]}</span>'

        edu_rows += row(left, right)
    education = section("Education", edu_rows)

    # ── Work Experience ───────────────────────────────────────────────────────
    exp_rows = ""
    for e in cv["work_experience"]:
        left  = f'<span class="date">{e["time"]}</span>'
        left += f'<br><span class="inst">{e["institution"]}</span>'

        bullets = "".join(_render_bullet(b) for b in e.get("bullets", []))
        right   = f'<span class="role">{e["role"]}</span>'
        right  += f'<ul class="bullets">{bullets}</ul>'

        exp_rows += row(left, right)
    experience = section("Work Experience", exp_rows)

    # ── Awards ────────────────────────────────────────────────────────────────
    award_rows = ""
    for a in cv["awards"]:
        left  = f'<span class="date">{a["year"]}</span>'
        right = f'<span class="role">{a["title"]}</span><br><span class="inst">{a["institution"]}</span>'
        award_rows += row(left, right)
    awards = section("Awards", award_rows)

    # ── Additional Relevant Experiences ───────────────────────────────────────
    extra_rows = ""
    for e in cv["additional_experiences"]:
        left    = f'<span class="inst">{e["institution"]}</span>'
        bullets = "".join(f"<li>{b}</li>" for b in e.get("bullets", []))
        right   = f'<span class="role">{e["title"]}</span><ul class="bullets">{bullets}</ul>'
        extra_rows += row(left, right)
    additional = section("Additional Relevant Experiences", extra_rows)

    # ── Publications ──────────────────────────────────────────────────────────
    # NLM style: fetches BibTeX from doi.org for volume/issue/pages.
    # Results cached in scripts/.bibtex_cache.json — delete to force re-fetch.
    journals  = load_works("journal")
    preprints = load_works("preprint")

    print("Building publications (fetching BibTeX where needed)…")
    pub_rows = ""
    for p in journals:
        year = str(p.get("date", ""))[:4]
        pub_rows += row(f'<span class="date">{year}</span>', _pub_cite(p))

    if preprints:
        pub_rows += '<div class="sub-header">Preprints and Under Review</div>'
        for p in preprints:
            year = str(p.get("date", ""))[:4]
            pub_rows += row(f'<span class="date">{year}</span>', _pub_cite(p))

    publications = section("Publications", pub_rows)

    # ── Conferences ───────────────────────────────────────────────────────────
    conferences = load_works("conference")
    conf_rows   = ""
    type_label  = {
        "conference-speaking":   "Speaker",
        "conference-poster":     "Poster",
        "conference-proceeding": "Proceeding",
    }
    for c in conferences:
        year  = str(c.get("date", ""))[:4]
        label = type_label.get(c.get("type", ""), "")
        left  = f'<span class="date">{year}</span>'
        if label:
            left += f'<br><span class="tag">{label}</span>'
        right  = f'<span class="role">{c["title"]}</span>'
        right += f'<br><span class="inst">{c.get("venue", "")}</span>'
        conf_rows += row(left, right)
    conferences_sec = section("Conferences", conf_rows)

    body = (header + interests + education + experience + awards
            + additional + publications + conferences_sec)

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>{CSS}</style>
</head>
<body>{body}</body>
</html>"""


# ── Stylesheet ────────────────────────────────────────────────────────────────
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,400&display=swap');

@page { margin: 2cm 2.2cm; size: A4; }

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: Lato, "Helvetica Neue", Arial, sans-serif;
  font-size: 10pt;
  color: #1a1a1a;
  line-height: 1.55;
}

/* ── Header ─────────────────────────────────────────────────── */
header {
  margin-bottom: 18pt;
  padding-bottom: 10pt;
  border-bottom: 1pt solid #1a1a1a;
}
h1 {
  font-size: 21pt;
  font-weight: bold;
  letter-spacing: 4pt;
  margin-bottom: 5pt;
}
.address {
  font-size: 8.5pt;
  color: #555;
  margin-bottom: 1pt;
}
.contact {
  font-size: 8.5pt;
  color: #555;
}

/* ── Section headers ─────────────────────────────────────────── */
section { margin-bottom: 12pt; }

h2 {
  font-size: 7.5pt;
  letter-spacing: 2.5pt;
  text-transform: uppercase;
  color: #666;
  font-weight: bold;
  border-top: 0.5pt solid #bbb;
  padding-top: 5pt;
  margin-bottom: 7pt;
}

.sub-header {
  font-size: 8.5pt;
  font-style: italic;
  color: #666;
  margin: 8pt 0 4pt;
  padding-left: 30%;
}

/* ── Two-column rows ─────────────────────────────────────────── */
.row {
  display: flex;
  margin-bottom: 7pt;
  page-break-inside: avoid;
}
.col-l {
  width: 30%;
  min-width: 30%;
  padding-right: 14pt;
  font-size: 8.5pt;
  color: #555;
  line-height: 1.5;
}
.col-r {
  flex: 1;
  font-size: 9.5pt;
  line-height: 1.55;
}

/* ── Type tokens ─────────────────────────────────────────────── */
.date   { font-size: 8.5pt; color: #333; }
.inst   { font-style: italic; color: #555; font-size: 8.5pt; }
.meta   { font-size: 7.5pt; color: #888; }
.role   { font-weight: bold; font-size: 9.5pt; }
.field  { font-style: italic; font-size: 9pt; color: #333; }
.detail { font-size: 8.5pt; color: #444; }
.tag {
  font-size: 7pt;
  letter-spacing: 1pt;
  text-transform: uppercase;
  color: #888;
}

/* ── Bullet lists ────────────────────────────────────────────── */
.bullets {
  margin: 3pt 0 0;
  padding: 0;
  list-style: none;
  font-size: 9pt;
}
.bullets li {
  padding-left: 11pt;
  text-indent: -11pt;
  margin-bottom: 1.5pt;
}
.bullets li::before { content: "· "; color: #888; }

.bullet-links {
  display: block;
  text-indent: 0;
  padding-left: 11pt;
  font-size: 7.5pt;
  color: #888;
  margin-top: 1pt;
}

/* ── Links ───────────────────────────────────────────────────── */
a { color: #1a1a1a; text-decoration: none; }
"""


if __name__ == "__main__":
    CV_DIR.mkdir(parents=True, exist_ok=True)

    cv = load_yaml(DATA / "cv.yml")
    now = datetime.now()
    today = now.strftime("%Y%m%d")
    generated_date = now.strftime("%Y-%m-%d")

    # ── PDF ──────────────────────────────────────────────────────────────────
    html    = build_html(cv)
    dated   = CV_DIR / f"cv_htunteza_{today}.pdf"
    current = CV_DIR / "cv_htunteza.pdf"

    HTML(string=html, base_url=str(ROOT)).write_pdf(dated)
    shutil.copy2(dated, current)

    dated_files = sorted(CV_DIR.glob("cv_htunteza_2*.pdf"), reverse=True)
    for old in dated_files[3:]:
        old.unlink()
        print(f"Removed old version: {old.name}")

    versions = [f.name for f in sorted(CV_DIR.glob("cv_htunteza_2*.pdf"), reverse=True)]
    print(f"Written:  {dated.name}")
    print(f"Current:  {current.name}")
    print(f"Versions: {versions}")

    # ── Markdown ─────────────────────────────────────────────────────────────
    md_text    = build_markdown(cv, generated_date)
    md_current = CV_DIR / "cv_htunteza.md"
    md_current.write_text(md_text, encoding="utf-8")
    print(f"Markdown: {md_current.name}")
