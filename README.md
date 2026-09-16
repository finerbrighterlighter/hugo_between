# htunteza.com — hugo_between

Personal website of Htun Teza, rebuilt in 2026 as an editorial two-voice page (see `docs/design.md`).
Hugo 0.157 (pinned in `netlify.toml`), no theme, no build step beyond Hugo's own pipes.

**[docs/operations.md](docs/operations.md) is the task-first guide**: how to add a post or a paper, put an
institution mark on a work, gate a document, add an external script, read a QC failure, and push this
repository to GitHub for the first time.

```bash
cp .env.example .env            # API keys for the live panels (optional)
dotenv run -- hugo server -w    # http://localhost:1313
hugo --gc --minify              # production build into public/
conda run -n hugo python scripts/build_cv.py   # regenerate the CV PDF/Markdown

npm ci                          # QC tooling (puppeteer, axe-core, pa11y; pinned in package.json)
npm run qc                      # the whole gate: see below
npm run qc:static               # the fast subset: hugo:check, build, links
npm run qc -- --only=a11y,links # or --skip=, --bail
CHROME_PATH=/usr/bin/chromium npm run qc      # use a system Chrome instead of puppeteer's bundled one
```

`npm run qc` runs nine steps in order and starts and stops the servers the browser steps need:

| step | what it asserts |
|---|---|
| `hugo:check` | the Hugo on PATH is the extended 0.157.0 that `netlify.toml` pins |
| `build` | `hugo --gc --minify` |
| `links` | no broken internal link in either language |
| `a11y` | axe-core WCAG 2.1 AA, desktop and phone, light and dark, both languages, balloon open, no reflow at 320px. Third-party requests are blocked, so the gate does not depend on the live APIs being up |
| `csp` | the production CSP does not block the site's own scripts |
| `smoke` | page behaviours: theme, cache, filters, cite panel, PIN gate, maths |
| `filters` | works filtering and URL state, desktop and phone |
| `balloon` | mobile navigation, keyboard traversal, focus return |
| `audit` | layout at phone widths, palette and theme persistence |

Every step runs even after an earlier failure, so one run reports everything that is wrong. The runner
allocates its own ports, captures server output, restarts a server that dies mid-run and times each step out,
so a failure is the site's fault rather than the harness's. CI (`.github/workflows/qc.yml`) runs the same
command on every push. A separate weekly workflow runs `npm run extlinks`, which checks external links and
the live APIs and only ever reports. `npm run marks:check` measures how faithfully the institution marks are
rendered and is the evidence for their PNG output.

`npm run a11y` fails on axe violations only. It prints axe's *incomplete* results separately, because axe
cannot read the background behind SVG text or a pseudo element and pa11y would report those as errors;
`npm run a11y:pa11y` still runs pa11y if you want its output. Deliberate exemptions live in
`scripts/a11y.js` with a written justification each.

Two mechanisms on this site look like access control and are not: the Simkl token is public and the PIN gate
on the transcripts is a deterrent. Both are deliberate and recorded in `docs/accepted-risks.md`. Read that
before putting anything sensitive behind either. Every gated document must carry
`accepted_public_disclosure: true` in `data/protected_documents.yml`, or the build fails.

University marks on work pages are third-party trademarks and are excluded from the site licence in the
footer. Every entry in `data/institutions.yml` must record its `source` and `rights`, or the build fails.

`docs/asset-policy.md` records an open decision about the 268 MB of binaries now in history.

Content, data and static files are shared with the previous site (`content/`, `data/`, `i18n/`, `static/general`,
`static/docs`); templates live in `layouts/`, styles in `assets/css/main.css`, browser modules in `static/js/`
(documented in `docs/js-modules.md`).
