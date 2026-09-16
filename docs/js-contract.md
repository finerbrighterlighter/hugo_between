# JS module contract — hugo_between

Target: `/home/finer/GitHub/hugo_between/static/js/` (ES modules, loaded with `type="module"`),
plus `/home/finer/GitHub/hugo_between/assets/js/config.js` (Hugo-templated, bundled with js.Build).

Reference implementations (fetch logic, caching, API endpoints, formatting): `/home/finer/GitHub/hugo_console/static/js/*.js`
and `/home/finer/GitHub/hugo_console/assets/js/config.js`. **Read them for logic; do not copy their DOM code.**
The old site was a terminal-styled dashboard with "panels"; the new site is an editorial page. No terminal
metaphors, no `.sh` strings, no window chrome, no ASCII bars, no prompt text anywhere in output.

Rules
- Vanilla ES modules, no build step besides esbuild for config.js. No frameworks.
- Every module self-gates: if its root element is absent, return immediately.
- Keep `cache.js` API-compatible (get/set with TTL from `window.CONFIG.cacheTTLMinutes`, flush) and reuse it in every fetcher.
- Respect `prefers-reduced-motion` for anything animated.
- Errors: fail quietly (leave server-rendered fallback text in place), `console.debug` only.
- All external links you create: `target="_blank" rel="noreferrer noopener"`.
- Text you render is sentence case, plain prose. No ALL CAPS, no "·" joins, no "→".

## config.js (assets/js/config.js)
Same shape as the old one (`window.CONFIG = {...}`) with keys: `unsplashKey`, `lastfmKey`, `simklClientId`, `simklToken`,
`cacheTTLMinutes`, `screenLimit`, `mangaLimit` (new, default 6), `photoLimit` (new, default 6), `lastfmUser`, `anilistUser`, `unsplashUser`.
Look at the old config.js for how env vars are templated (`getenv "HUGO_..."`) and keep the same env var names.
Usernames: take the values currently hard-coded inside the old lastFM.js / anilist.js / unsplash.js and move them to
`site.Params` reads in config.js (`site.Params.lastfmUser` etc.) with the old hard-coded values as `default`.

## Home page — "Meanwhile" section (live, browser-side)

### `#now-playing` (lastFM.js)
Server HTML:
```html
<p id="now-playing" data-fallback="…">Listening: <span class="np-track">—</span></p>
```
On success, replace the element's content with one sentence, e.g.
`Listening to <a href="{trackUrl}">{track}</a> by {artist}` + `<span class="np-when">, now</span>` or `, {n} minutes ago` / `, yesterday`.
Set `data-state="playing"` when now playing else `data-state="recent"`. Playlists are rendered by Hugo, not JS.

### Cover strips: `#strip-manga` (anilist.js), `#strip-screen` (simkl.js), `#strip-photos` (unsplash.js)
Server HTML (each):
```html
<ul class="covers" id="strip-manga" aria-label="Manga I am reading" data-limit="6"></ul>
```
JS appends `<li>` items:
```html
<li class="cover">
  <a href="{externalUrl}" target="_blank" rel="noreferrer noopener">
    <img src="{image}" alt="" width="…" height="…" loading="lazy" decoding="async">
    <span class="cover-title">{Title}</span>
    <span class="cover-meta">{progress or year}</span>
  </a>
</li>
```
- manga: title = English title if present else romaji; meta = `Chapter {n}` (or `Chapter {n} of {total}`), limit from `data-limit` or `CONFIG.mangaLimit`.
- screen (Simkl): keep the old fetching strategy exactly (`/sync/all-items?date_from=` window, full-library fallback under 10, one `/anime/{id}` detail call for English titles, `simkl.in` posters `_c`). Meta: movies → year; shows → `Season {s}, episode {e}`; anime → `Episode {e}`.
- photos (Unsplash): latest uploads, meta = location or the upload month (`March 2026`). Alt from Unsplash `alt_description` if present.
- Photos: also expose the Unsplash profile URL: if `#strip-photos` has `data-profile-url`, ignore (Hugo renders the link).
- The parent `<section>` has `hidden` on a sibling placeholder `.covers-empty`; on zero items, set `hidden` on the `<ul>` and remove it from `.covers-empty`.

### `#metrics` (openalex.js)
Server HTML:
```html
<p id="metrics" data-openalex-author="A…" hidden>
  Cited <span data-metric="cited_by_count">—</span> times across
  <span data-metric="works_count">—</span> indexed works, h-index <span data-metric="h_index">—</span>,
  i10-index <span data-metric="i10_index">—</span> (OpenAlex).
</p>
```
Fill the spans (locale-formatted integers) and remove `hidden`. Author id: use the same author lookup the old openalex.js uses
(ORCID from `data-openalex-author` if present, else the old hard-coded value). No chart. Drop the yearly bar chart entirely.

### `[data-clock]` (currenttime.js)
`<time data-clock data-tz="Asia/Bangkok" data-city="Bangkok"></time>` → `14:32 in Bangkok`, updated each minute. Also set `datetime`.

## Works list page (works_filter.js)
Server HTML:
```html
<form id="works-filter" role="search">
  <input id="works-search" type="search" name="search" placeholder="Search titles, venues, co-authors, topics">
  <fieldset class="filter-group" data-group="conditions"> <button type="button" class="filter-tag" data-tag="hypertension" aria-pressed="false">hypertension</button> … </fieldset>
  (same for datasource, methods)
  <button type="button" id="works-clear" hidden>Clear filters</button>
</form>
<p id="works-count" aria-live="polite"><!-- "12 of 22 works" --></p>
<section class="works-group" data-group="journal"><h2>Journal articles</h2>
  <ol class="bib"><li class="bib-entry" data-search="lowercased haystack" data-tags="hypertension|ehr|survival analysis">…</li></ol>
</section>
```
Behaviour: text search over `data-search` (case-insensitive, all words must match); tags are AND-combined; pressed state via `aria-pressed`;
hide `li` that fail; hide `.works-group` with no visible entries; update `#works-count` as `{visible} of {total} works`;
read `?search=` on load and set the input; mirror the current query into the URL with `history.replaceState` (search + `tags=` comma list).
`#works-clear` visible when any filter is active.

## Work single page
### work-citation.js
`<a data-citation-count data-doi="10.…" href="https://openalex.org/…" hidden>Cited <span>—</span> times</a>` →
fill the span, set href to the OpenAlex citing-works list URL as the old module did, remove `hidden`. Cache in localStorage as before.

### work-cite.js (replaces work-bibtex.js)
Server HTML:
```html
<details class="cite" data-doi="10.…">
  <summary>Cite this paper</summary>
  <div class="cite-body">
    <p class="cite-status" role="status"></p>
    <div class="cite-formats" role="radiogroup" aria-label="Citation format">
      <button type="button" data-format="bibtex" aria-pressed="true">BibTeX</button>
      <button type="button" data-format="nlm" aria-pressed="false">NLM</button>
      <button type="button" data-format="apa" aria-pressed="false">APA</button>
      <button type="button" data-format="ama" aria-pressed="false">AMA</button>
    </div>
    <pre class="cite-output" tabindex="0"></pre>
    <div class="cite-actions">
      <button type="button" data-action="copy" disabled>Copy</button>
      <button type="button" data-action="bib" disabled>Download .bib</button>
      <button type="button" data-action="ris" disabled>Download .ris</button>
    </div>
  </div>
</details>
```
On first `toggle` open: fetch BibTeX from doi.org (Accept: application/x-bibtex), cache `bibtex-<doi>` via cache.js.
Status text: `Fetching from doi.org…` → `` (empty) on success, or `doi.org did not return a citation for this entry.`
Keep the old formatters exactly (BibTeX prettify + highlight spans `.tok-key/.tok-punct/.tok-title/.tok-journal/.tok-author`; NLM all authors;
APA ≤20 authors; AMA >6 → first 3 + et al.). Copy uses `pre.textContent`. .bib download = raw doi.org string. RIS as before.
No fake CLI status sequence, no `[INFO]`/`[OK]` lines, no `pub-get` prompt.

## Protected document page (protected-document.js)
The gate is a deterrent, not access control; the salt, verifier and document path are all public.
See `docs/accepted-risks.md` before putting anything sensitive behind it.

Server HTML:
```html
<section class="gate" data-document-id="msc-transcript" data-salt="…" data-verifier="…" data-src="/general/documents/….pdf">
  <form class="gate-form" novalidate>
    <label for="pin">PIN</label>
    <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="off" required>
    <button type="submit">Unlock</button>
    <p class="gate-status" role="status"></p>
  </form>
  <div class="gate-viewer" hidden>
    <iframe title="Document viewer" hidden></iframe>
    <a class="gate-open" href="#" target="_blank" rel="noreferrer noopener" hidden>Open the PDF in a new tab</a>
  </div>
</section>
```
Keep the old verification (SHA-256(salt + trimmed PIN) via Web Crypto with fallback), unlock persistence through cache.js keyed by document id,
blob URL creation + revoke on `pagehide`, async race guards. Status strings from `data-*` attributes on the section
(`data-i18n-prompt`, `data-i18n-checking`, `data-i18n-loading`, `data-i18n-incorrect`, `data-i18n-error`, `data-i18n-unlocked`, `data-i18n-unsupported`).
On mobile (<768px) skip the iframe and just show the open link. No blurred fake preview, no masked `*` overlay.

## Theme (theme.js)
Head has an inline pre-paint script (written by the templates, not you) that sets `data-theme="light|dark"` on `<html>` from localStorage key `theme`
or `prefers-color-scheme`. `theme.js` handles `[data-theme-toggle]` buttons: cycle light → dark → light, persist to localStorage `theme`,
update `aria-label` (`Switch to dark mode` / `Switch to light mode`), dispatch `theme-changed` on `document`. Keep it ~40 lines.

## Cache flush (cache-expires.js → privacy.js)
`<button data-cache-flush>Clear cached data</button> <span data-cache-status role="status"></span>` → flush cache.js keys + `bibtex-*` + `theme` untouched;
status `Cleared.` for 3 s.

## Duck (duck.js)
```html
<button class="portrait" id="portrait" type="button" aria-label="Portrait of Htun Teza. Press for a surprise." aria-keyshortcuts="Enter Space">
  <img class="portrait-photo" src="/general/profile.webp" alt="" width="…" height="…">
  <img class="portrait-duck" src="/general/duck_mascot.webp" alt="" hidden>
</button>
<audio id="quack" src="/general/duck_quack.mp3" preload="none"></audio>
```
On press: show duck for ~1.2 s (toggle `.is-duck` class on the button; CSS does the crossfade), play the quack (3-voice pool), respect reduced motion (no animation, still swap).

## Posts
- `katex-init.js`, `mermaid-init.js`, `post_toc.js`: port from old with the new TOC container `<nav class="toc" id="toc" aria-label="Contents"></nav>`
  (build a nested list from `h2`/`h3` in `.post-body`; hide the nav if fewer than 3 headings).

## Not ported (intentionally): console_type.js, footer_roll.js, nav_bubble.js, collapse_windows.js, research.js, github.js (build-time now), not_found.js, mm_font_toggle.js, theme-init.js (inline now).

Deliverable: the files above in `hugo_between/static/js/` and `hugo_between/assets/js/config.js`; a short `docs/js-modules.md` table (file → root selector → source API). Run `node --check` on each file.
