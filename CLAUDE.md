# hugo_between — Claude project notes

Redesign of htunteza.com (2026, "Between"). Read `docs/design.md` first: it records the directions explored, the
chosen system (centre spine, two voices, Newsreader + Karla, one ochre accent) and what each old feature became.
`docs/js-contract.md` is the DOM contract the browser modules implement; `docs/js-modules.md` lists them.

Rules that still hold from the old project: preserve public URLs; `private: true` hides a page from lists and the
sitemap; works front matter, `data/researchers.yml` ids/ORCID dedup, the CV builder and the llms.txt outputs are
unchanged. Never reintroduce terminal or panel motifs.

Local dev: `dotenv run -- hugo server -w`. Review: `node scripts/shot.js`, `node scripts/smoke.js`, `pa11y --config scripts/pa11y.json`.

## crew
- test: `PATH=/home/finer/.local/hugo-0.157.0:$PATH npm run qc:static`
- guard: behaviour-preserving build check — build `main` and `HEAD` with `hugo --gc --minify` into fresh dirs and `diff -r` them; the diff must be empty
- env: a build needs no env vars; `.env` holds optional `HUGO_*` API keys and a PATH override for the pinned Hugo 0.157.0 extended at `~/.local/hugo-0.157.0`; `node_modules` is not needed by `qc:static`
- server: `dotenv run -- hugo server -w`
- branch: crew work goes on `crew/<slug>` branched from `main`; never push, never merge, never commit on `main`
- sensitive_paths: .env
