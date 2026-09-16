# htunteza.com — hugo_between

Personal website of Htun Teza, rebuilt in 2026 as an editorial two-voice page (see `docs/design.md`).
Hugo 0.157 (pinned in `netlify.toml`), no theme, no build step beyond Hugo's own pipes.

```bash
cp .env.example .env            # API keys for the live panels (optional)
dotenv run -- hugo server -w    # http://localhost:1313
hugo --gc --minify              # production build into public/
conda run -n hugo python scripts/build_cv.py   # regenerate the CV PDF/Markdown

npm ci                          # QC tooling (puppeteer, axe-core, pa11y; pinned in package.json)
npm run qc                      # production build, then internal link check (scripts/links.js)
npm run serve                   # serve public/ on 127.0.0.1:1313 for the browser checks
npm run a11y                    # axe-core WCAG 2.1 AA, light and dark, both languages
npm run smoke                   # browser smoke test (needs `hugo server`, not the static serve)
CHROME_PATH=/usr/bin/chromium npm run a11y    # use a system Chrome instead of puppeteer's bundled one
```

CI (`.github/workflows/qc.yml`) runs the build, the link check and the accessibility gate on every push,
against Hugo 0.157.0 pinned to match `netlify.toml`. The puppeteer scripts use the bundled Chromium unless
`CHROME_PATH` is set.

`npm run a11y` fails on axe violations only. It prints axe's *incomplete* results separately, because axe
cannot read the background behind SVG text or a pseudo element and pa11y would report those as errors;
`npm run a11y:pa11y` still runs pa11y if you want its output. Deliberate exemptions live in
`scripts/a11y.js` with a written justification each.

Two mechanisms on this site look like access control and are not: the Simkl token is public and the PIN gate
on the transcripts is a deterrent. Both are deliberate and recorded in `docs/accepted-risks.md`. Read that
before putting anything sensitive behind either.

Content, data and static files are shared with the previous site (`content/`, `data/`, `i18n/`, `static/general`,
`static/docs`); templates live in `layouts/`, styles in `assets/css/main.css`, browser modules in `static/js/`
(documented in `docs/js-modules.md`).
