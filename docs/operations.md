# How to do things

A task-first guide to this site. Find what you want to do, do the steps, run the gate.

Everything below assumes you are in the repository root with the pinned Hugo on your PATH. The one setup step:

```bash
cp .env.example .env     # then edit: API keys, and PATH for the pinned Hugo
npm ci                   # QC tooling; needs Node 22
```

The gate is always the same command, and it is the answer to "did I break anything":

```bash
npm run qc               # about two and a half minutes, nine checks
```

If `hugo:check` fails, your PATH is pointing at the wrong Hugo. The site is pinned to 0.157.0 extended in
`netlify.toml`, and CI installs exactly that. Prepend the pinned build to PATH, or set it in `.env` as
`.env.example` describes and run through `dotenv`.

---

## Write something

### A blog post

Create a page bundle under `content/posts/`, with an `index.md` and its images beside it:

```
content/posts/260901_my_post/
  index.md
  photo-1.jpg
```

Front matter needs `title`, `date`, and a `url` if you want a short public path:

```yaml
---
title: Something I Learned
url: /posts/something_learned/
date: 2026-09-01
---
```

Put `<!--more-->` after the first paragraph or two. Everything before it becomes the summary on the Posts page
and the meta description, so make it a real opening rather than a throat-clear. Section headings inside a post
start at `##`, never `###`: the template supplies the `h1`, and skipping a level is an accessibility defect the
gate will not catch because it only reads the rendered page, not your intent.

Images go through `{{< gallery match="prefix*" >}}` for a set, or are referenced normally for one.

### A paper, talk, poster or thesis

One file under `content/works/<type>/`. The type directory decides the layout and whether the item gets its own
page. Copy `content/works/<type>/example.md`, which carries the full commented front matter.

| `type:` | Directory | Gets its own page |
|---|---|---|
| `journal`, `preprint`, `dissertation` | matching directory | yes |
| `conference-speaking`, `conference-proceeding`, `conference-poster` | `conference/` | no, list only |
| `report` | `report/` | no, list only |
| `under-review` | `review/` | listed, excluded from the output timeline |

Authors are `id:` references into `data/researchers.yml`, which is where names, ORCIDs and affiliations live.
Your own entries are at the top of that file. Use `highlight: true` on yourself. If a co-author is not in the
file, you can inline `given:` and `family:` instead, but adding them properly means their ORCID links and
affiliation numbering work everywhere.

The "list only" types are why the University of Dental Medicine mark currently appears nowhere: the only work
tagged `udmy` is a report, and reports do not render a page. If you want that mark visible, either give reports
their own pages by removing the `render: never` cascade in `content/works/_index.md`, or tag a work that does
render.

### A Burmese translation

Add `index.mm.md` beside the English `index.md`, or `name.mm.md` beside `name.md`. Interface strings live in
`i18n/mm.yaml`, which is yours: do not let a tool rewrite it.

If a page exists in English only, navigation to it falls back to the English URL and marks the language change
with `hreflang`, rather than inventing a Burmese URL that 404s. That is what `layouts/partials/lang-link.html`
does, and it is why the Burmese masthead links to `/works/` rather than `/mm/works/`.

Burmese numerals: pass a count through `layouts/partials/localized-number.html` before putting it in a
sentence, or it will render in Latin digits inside Burmese text.

---

## Change the home page

### Add a job or a degree

Edit `data/homepage.yml` (and `data/homepage_mm.yml`) under `experiences.info` or `education.info`. Nothing
else needs touching:

- **Now or Before** is decided by whether the entry is ongoing, meaning `current: true` or a `time` string
  ending in Present, လက်ရှိ or ယခု. Not by country, so moving abroad just adds an entry.
- **Order** is latest first, with education and experience interleaved by start year, so a degree taken during a
  job appears next to it. The year is parsed from the `time` string by
  `layouts/partials/chron-year.html`, which handles Myanmar digits.
- **The tail folds away** past `chronVisibleLimit` in `hugo.toml`, currently 3. Raise it to show more, lower it
  as roles accumulate. Nothing is ever hidden without a way to open it.

### Put an institution mark on a work page

Add `institution: mahidol` or `institution: udmy` to the work's front matter. That is a claim about where you
were when you did the work, so it is never inferred from the date.

To add a new institution:

1. Put the logo under `assets/images/institutions/`.
2. Add an entry to `data/institutions.yml` with `name`, `short`, `logo`, `link`, **`source`**, **`rights`**
   and **`fit`**.

`fit` says how the mark sits in the circular frame every mark gets. Aspect ratio cannot decide it, because a
round seal and a square block are both 1:1.

| `fit` | For | What happens |
|---|---|---|
| `fill` | a mark that is itself round | it meets the ring; its empty corners are all the circle clips |
| `inscribe` | anything square, shield-shaped or rectangular | it sits inside the circle's largest inner square, so no corner is cut |

`inscribe` is the default, because it is the one that never damages a mark. Both current seals are `fill`.

A mark much wider than it is tall fails the build. That is a horizontal lockup, and at 108px it is either
clipped at both ends or shrunk past reading. Institutions publish an emblem as well; use that.

The build fails without `source` and `rights`, on purpose. These marks are other people's trademarks and are
excluded from the site's licence in the footer; the fields are you stating where the file came from and on what
basis you are using it. A misspelled `institution:` key also fails the build rather than silently dropping the
mark.

Marks are rendered as lossless PNG, not the site's usual WebP, because lossy WebP subsamples colour and these
seals are fine gold-on-blue detail. `npm run marks:check` measures the result and fails below 40 dB. If you add
a mark and it looks soft, run that first.

---

## Publish a document behind the PIN gate

Read `docs/accepted-risks.md` before you do this. The gate is a deterrent, not access control: the PDF is a
public static file and the salt and verifier are in the page source. Anyone who reads the markup can fetch the
document without the PIN.

1. Put the PDF under `static/general/documents/` with an opaque filename.
2. Add an entry to `data/protected_documents.yml`, including `accepted_public_disclosure: true`.
3. Add a page with `layout: protected-document`, `private: true` and `protected_document: <key>`.
4. Add `no-store` and `noindex` headers for the path in `netlify.toml`.

Step 2 is a statement that disclosure of this specific file would be unwelcome but not harmful. The build fails
without it. If that sentence is not true of your document, this template is the wrong tool and you need real
authorization instead.

---

## Regenerate the CV

```bash
conda run -n hugo python scripts/build_cv.py
```

It reads `data/cv.yml` and the works, and writes the PDF and Markdown under `static/general/cv/`.

---

## Add an external script, font or API

**Update the Content-Security-Policy in `netlify.toml` first.** The policy is enforced, so anything you add
without listing it will silently fail in production and work fine in `hugo server`, which sends no headers.

- A script host goes in `script-src`, path-scoped where possible.
- An API you `fetch` goes in `connect-src`.
- Images from a new CDN go in `img-src`.

Then run `npm run csp`, which serves the built site with the production policy and reports violations. This is
the only local way to see what the real policy will block.

Self-host fonts under `static/fonts/` or `static/theme/font/` and declare them in `assets/css/main.css`. The
site loads no fonts from anyone's network. If you add one, add it to `LICENSE` and to
`content/general/credits/index.md` as well; the credits page is built from what the site actually ships.

---

## Rotate the API keys

Keys live in `.env`, which is gitignored, and are templated into the browser by `assets/js/config.js`.

The Unsplash and Last.fm keys are ordinary public client keys. **The Simkl token is a bearer token and is
public by design** — see `docs/accepted-risks.md`. Rotating it does not make it private; a new token is public
the moment it deploys. Keep its scopes read-only, and do not reuse it anywhere else.

---

## Check your work

```bash
npm run qc                      # everything, about 2m30s
npm run qc:static               # fast: version check, build, links
npm run qc -- --only=a11y       # one step
npm run qc -- --skip=audit      # all but one
npm run qc -- --bail            # stop at the first failure
CHROME_PATH=/usr/bin/chromium npm run qc    # use a system Chrome
```

What each step is actually asserting:

| Step | Fails when |
|---|---|
| `hugo:check` | the Hugo on PATH is not the pinned extended 0.157.0 |
| `build` | the build errors, including the institution and protected-document guards |
| `links` | any internal link, image or asset reference does not resolve, in either language |
| `a11y` | axe finds a WCAG 2.1 AA violation, on desktop or phone, light or dark, either language, balloon open or closed, or the page scrolls sideways at 320px |
| `csp` | the production policy blocks something the site needs |
| `smoke` | a page behaviour broke: theme, cache, filters, cite panel, PIN gate, maths |
| `filters` | works filtering or its URL state broke |
| `balloon` | mobile navigation, keyboard traversal or focus return broke |
| `audit` | layout at phone widths, or palette and theme persistence, broke |

Reading a failure:

- The accessibility step reports **violations**, which fail, separately from **incomplete**, which do not.
  Incomplete means axe could not decide, usually because it cannot read a background behind SVG text or a
  pseudo element. The recurring ones were checked by hand and the verdict is recorded at the top of
  `scripts/a11y.js`. Do not treat them as defects without reading that.
- Deliberate exemptions are listed in `scripts/a11y.js` with a written reason each. There is currently one.
- If a step fails because its server died, the runner prints that server's last output. A bare
  connection error with no explanation is a bug in the runner, not in the site.
- Screenshots from the browser steps land in `.qc-shots/`, or `QC_SHOT_DIR` if you set it.

`npm run extlinks` checks external links and the live APIs. It only ever reports and never fails, because a
publisher being down is not your bug. A weekly workflow runs it.

---

## Deploy

Netlify builds `hugo --gc --minify` with Hugo 0.157.0 from `netlify.toml`. Push to the deploy branch and it
goes out. There is nothing to run by hand.

Public URLs are preserved from the previous site and must stay that way. If you change a path, add a redirect
in `netlify.toml` rather than breaking the old one.

---

## Push this repository to GitHub for the first time

Nothing is pushed yet and no remote is configured. When you are ready:

```bash
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin master
```

Before you do, three things are worth knowing.

**The history contains large binaries, and that is accepted.** About 268 MB packed, mostly photographs.
`docs/asset-policy.md` records the decision and, more usefully, the number that actually matters: no page
transfers more than 0.6 MB, because everything goes through the image pipeline. Watch that number, not the
repository size.

**Check what is about to become public.** `.env` is ignored and the transcripts behind the PIN gate are
intentionally public files, but confirm that is still what you want:

```bash
git ls-files | grep -iE '\.env|secret|token|credential'   # expect only .env.example
```

**CI has never run.** `.github/workflows/qc.yml` is defined and every step in it passes locally, but a hosted
run will be the first real test of it. Expect to iterate on the workflow once. That is normal and is the last
outstanding item before calling the site's quality gate proven.

---

## Where things are written down

| File | What it settles |
|---|---|
| `docs/design.md` | the visual system and every pass that shaped it |
| `docs/accepted-risks.md` | the public Simkl token and the PIN gate, and why both are deliberate |
| `docs/asset-policy.md` | the open decision about binaries in git history |
| `docs/js-contract.md` | the DOM contract the browser modules rely on |
| `docs/js-modules.md` | what each browser module does |
| `content/general/credits/index.md` | typefaces, software and data sources, reader-facing |
| `LICENSE` | what CC BY 4.0 covers here, and what it does not |
| `QC_EVALUATION.md`, `QC_REAUDIT.md`, `QC_FINAL_REVIEW.md` | three external reviews and the replies to them |
