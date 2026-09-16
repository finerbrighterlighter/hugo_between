# JS modules — hugo_between

All files are vanilla ES modules loaded with `type="module"`; each one self-gates on its root selector and returns when the element is absent. Errors fail quietly (server-rendered fallback stays, `console.debug` only). Fetchers cache through `cache.js`, whose TTL comes from `window.CONFIG.cacheTTLMinutes`.

| File | Root selector | Source / API | Notes |
| --- | --- | --- | --- |
| `assets/js/config.js` | — | Hugo `getenv` + `site.Params` | Templated by js.Build; sets `window.CONFIG`. Keys: `unsplashKey`, `lastfmKey`, `simklClientId`, `simklToken`, `cacheTTLMinutes`, `screenLimit`, `mangaLimit`, `photoLimit`, `lastfmUser`, `anilistUser`, `unsplashUser`. |
| `static/js/cache.js` | — | localStorage | `getCache`, `setCache`, `clearCache`, `clearSiteStorage`, `listCacheEntries`. Entries under `cache:`; `theme` never touched. |
| `static/js/covers.js` | — | — | Shared `<li class="cover">` renderer for the three strips; `renderCovers`, `showEmpty`, `limitFor`. |
| `static/js/lastFM.js` | `#now-playing` | Last.fm `user.getrecenttracks` | One sentence, `data-state="playing|recent"`, polls every 30 s, not cached. |
| `static/js/anilist.js` | `#strip-manga` | AniList GraphQL | Recent manga (all statuses except planning), `Chapter n [of total]`. |
| `static/js/simkl.js` | `#strip-screen` | Simkl `/sync/all-items`, `/anime/{id}` | 14-day window first, full library when under limit; simkl.in `_c` posters. |
| `static/js/unsplash.js` | `#strip-photos` | Unsplash `/users/{user}/photos` | Latest uploads; meta = location or upload month. |
| `static/js/openalex.js` | `#metrics` | OpenAlex `/authors/{id}` | Fills `[data-metric]` spans, unhides. Accepts OpenAlex id or ORCID in `data-openalex-author`. |
| `static/js/currenttime.js` | `[data-clock]` | `Intl.DateTimeFormat` | `14:32 in Bangkok`, minute-aligned refresh, sets `datetime`. |
| `static/js/works_filter.js` | `#works-filter` | DOM only | Word search over `data-search`, AND tags via `aria-pressed`, `?search=&tags=` mirrored with `replaceState`. |
| `static/js/work-citation.js` | `[data-citation-count][data-doi]` | OpenAlex `/works/doi:{doi}` | Fills count, links to citing works, unhides when ≥ 1. |
| `static/js/work-cite.js` | `details.cite[data-doi]` | doi.org (`Accept: application/x-bibtex`) | BibTeX / NLM / APA / AMA, copy, `.bib` and `.ris` download. Cache key `bibtex-<doi>`. |
| `static/js/protected-document.js` | `section.gate[data-document-id]` | same-origin PDF fetch | SHA-256(salt + PIN) vs `data-verifier`, unlock remembered via cache.js, blob URL revoked on `pagehide`, link only under 768 px. |
| `static/js/theme.js` | `[data-theme-toggle]` | localStorage `theme` | Light/dark cycle, aria-label, dispatches `theme-changed`. |
| `static/js/privacy.js` | `[data-cache-flush]` | cache.js | Flushes cache and stray `bibtex-*` keys; `[data-cache-status]` shows `Cleared.` for 3 s. |
| `static/js/duck.js` | `#portrait` | `#quack` audio | Toggles `.is-duck` for 1.2 s, three-voice quack pool, adds `.no-motion` under reduced motion. |
| `static/js/katex-init.js` | `.post-body` (falls back to body) | KaTeX auto-render global | Requires katex + auto-render loaded first. |
| `static/js/mermaid-init.js` | `pre code.language-mermaid` | jsDelivr `mermaid@11` (dynamic import) | Colours from computed body/link styles; re-renders on `theme-changed`. |
| `static/js/post_toc.js` | `nav#toc` + `.post-body` | DOM only | Nested `<ol>` from h2/h3; hidden under three headings. |

## Loading order

`config.js` (bundled) must run before any fetcher so `window.CONFIG` exists. `katex-init.js` must come after the KaTeX scripts. Everything else is independent.

## Deviations from the contract worth knowing

- Cover strips reveal `.covers-empty` on fetch failure as well as on zero items, since an empty `<ul>` would otherwise show nothing.
- `#strip-photos` uses the Unsplash `small` rendition (400 px) with `width`/`height` derived from the photo's aspect ratio. The list endpoint rarely returns `location`, so most photos fall back to the upload month.
- `#now-playing` beyond "yesterday" says `, n days ago` (under a week) or `, on 3 March`.
- `work-citation.js` swaps the trailing "times" text node to "time" when the count is exactly one.
- `mermaid-init.js` reads theme colours from computed body and link styles rather than named CSS variables, since the new stylesheet's variable names were not part of the contract.
- `duck.js` plays the quack under reduced motion too (the contract only asks for no animation); CSS can key off `.no-motion` on the button.
