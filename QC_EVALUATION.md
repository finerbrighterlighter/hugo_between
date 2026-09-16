# QC Evaluation — `hugo_between`

Date: 2026-09-16  
Scope: build integrity, rendered markup, information architecture, accessibility, SEO, security/privacy, performance, maintainability, and release readiness.

## Verdict

This is a strong, distinctive personal research site—not a generic generated portfolio. The editorial “two voices” concept fits the subject, the implementation is unusually thoughtful about semantics and accessibility, and the production build is clean.

It is **not ready for an unconditional production sign-off**, however. Two mechanisms advertised as private expose credentials or documents to every browser, and the repository currently has no committed baseline or reproducible CI gate. Fix those before treating the site as production-safe.

**Overall: 7.1/10**

| Area | Score | Judgment |
|---|---:|---|
| Design and identity | 8.8 | Memorable, coherent, and appropriate to the “between health and data” story. |
| Content and information architecture | 8.0 | Strong opening proposition and rich evidence; the home page becomes dense later. |
| Accessibility | 8.2 | Excellent foundations; three heading-outline defects and browser testing still need closure. |
| SEO and metadata | 7.6 | Broad coverage, with a few concrete indexing and language-tag errors. |
| Performance | 6.8 | Responsive images and conditional scripts are good; several galleries and deploy assets are heavy. |
| Maintainability | 7.3 | Clear partials and documentation; test tooling is machine-specific. |
| Security and privacy | 4.0 | Public bearer token architecture and client-side-only document gates are release blockers. |
| Release engineering | 3.5 | Clean build, but no Git baseline, package manifest, or automated quality gate. |

## What is already excellent

- The home page communicates the professional identity immediately: “Dentist by training, health-data researcher by practice” is clear, specific, and credible.
- The “Health | Data” visual/content system is derived from the subject rather than a template. It is documented well in `docs/design.md` and consistently represented in the templates.
- The production build succeeds on Hugo 0.165.0 with no warnings or errors. It emits 56 HTML files (55 substantive pages plus an alias), 894 files total, and approximately 142 MB of deploy output.
- Semantic foundations are strong: one main heading on substantive rendered pages, a skip link, a focusable main landmark, labeled navigation, proper focus-visible styling, and reduced-motion handling.
- Contrast is strong across all supplied palettes. The lowest measured text/accent pairing was 4.66:1; primary text pairings exceed 14:1.
- Responsive images include intrinsic dimensions, `srcset`, `sizes`, WebP conversion, lazy loading, and async decoding. The home portrait correctly receives `fetchpriority="high"`.
- Metadata coverage is unusually complete: canonical URLs, Open Graph, Twitter cards, hreflang in the document head, RSS discovery, breadcrumb JSON-LD, `BlogPosting`, `ScholarlyArticle`, and private-page sitemap filtering.
- Security headers are a good starting point: CSP, HSTS, `X-Content-Type-Options`, referrer policy, permissions policy, and frame restrictions are defined in `netlify.toml`.
- JavaScript is mostly progressively enhanced and page-scoped. The baseline is eight scripts in production; specialist modules are conditional on home, work, works, math, or protected-document layouts.
- The source is thoughtfully documented (`docs/design.md`, `docs/js-contract.md`, and `docs/js-modules.md`) and data-driven instead of duplicating content in templates.

## Release blockers

### P0 — A Simkl bearer token is shipped to every visitor

`assets/js/config.js:2-7` explicitly places `HUGO_SIMKL_TOKEN` in `window.CONFIG`. `static/js/simkl.js:17,23-27` then sends it as `Authorization: Bearer ...` from the browser.

Anything in client-side JavaScript is public. A visitor can copy the token from the generated config file and call Simkl directly. Depending on its scopes, that may reveal or modify account data.

Required action:

1. Revoke and rotate the current token.
2. Remove `simklToken` from the generated browser config.
3. Proxy authenticated requests through a server-side function with a narrowly scoped response, or replace the integration with a genuinely public endpoint/feed.
4. Add a build-time scan that fails if generated output contains known secret variable values.

### P0 — The “protected documents” are not access-controlled

`layouts/_default/protected-document.html:11-13` publishes the document path, salt, and password verifier in the HTML. `static/js/protected-document.js:156` fetches the already-public PDF only after client-side checking; lines 215-217 compare a browser-computed hash. The numeric-input hint also implies a small password search space.

The gate prevents casual clicking but not access. Anyone can inspect the HTML, read `data-src`, and request the PDF directly. The exposed salt/verifier also permits offline password guessing. `noindex` and `no-store` headers do not provide authorization.

Required action:

1. Remove sensitive PDFs from the public Hugo/Netlify publish directory.
2. Serve them through real authorization: Netlify Identity/gated functions, signed expiring URLs from private object storage, or another authenticated backend.
3. Ensure a direct document URL returns `401`/`403` without a valid session or signed URL.
4. Rotate document URLs after migration because current paths should be considered disclosed.

### P0 — There is no recoverable release baseline

`git status` reports every project file as untracked, and `master` has no commits. There is no rollback point, attributable change history, or reliable review boundary.

Required action: after resolving secrets/privacy, create a reviewed initial commit and tag the first releasable state. Do not commit `.env`; it is correctly ignored.

## High-priority correctness findings

### P1 — Burmese navigation points to pages that do not exist

The build contains seven Burmese substantive pages but no `/mm/works/` or `/mm/posts/`. Nevertheless, `layouts/partials/masthead.html:5-16` applies `relLangURL` to every global navigation entry from `hugo.toml:41-48`. Static link analysis found these broken links on every Burmese page, including the Burmese 404 page.

Choose an explicit localization policy:

- link untranslated destinations to the English URL and mark the language change, or
- hide unavailable navigation entries in Burmese, or
- create localized list pages that intentionally surface English items.

Do not synthesize a localized URL unless that page exists.

### P1 — One public content link is broken

`content/posts/220928_ceb_rwd/index.md:8` links to `/assets/docs/realworlddata.pdf`, but the built file is at `/docs/realworlddata.pdf`.

Add an output link checker to CI so this class of regression fails the build.

### P1 — Quality checks are not reproducible

The repository has useful browser scripts, but `scripts/smoke.js:1-6` and `scripts/final_audit.js:1-6` import Puppeteer from one developer-specific absolute NVM path and assume `/usr/bin/chromium`. There is no `package.json`, lockfile, or single QC command.

Add a small Node project with pinned dev dependencies and scripts such as `build`, `smoke`, `a11y`, `links`, and `qc`. Make browser executable selection configurable. Run them in CI and Netlify deploy previews.

### P1 — GitHub automation is explicitly ignored

`.gitignore:46-47` ignores the entire `.github/` directory. That prevents committing CI workflows, Dependabot configuration, issue templates, and security policy metadata.

Remove that blanket ignore. Ignore only genuinely local files.

## Medium-priority improvements

### P2 — Heading levels skip directly from the page title

Three rendered posts jump from the template-provided `h1` to `h3` or `h4`:

- `content/posts/221106_where_how_what/index.md:10,22,32,40,58`
- `content/posts/221112_blood_2022/index.md:10,18,26`
- `content/posts/231003_thaihai_datathon/index.md:17,31,39,47,59,71`

Make these section headings `h2`. Styling should be handled by CSS rather than choosing a heading level for visual size.

### P2 — The 404 pages ask search engines to index them

`layouts/partials/head.html:13` emits `index, follow` for every non-private page, including both generated 404 pages. Emit `noindex, follow` when `.Kind` is `404`.

### P2 — Sitemap hreflang uses the site key instead of the language tag

The document head correctly maps the internal `mm` key to BCP 47 `my`, but `layouts/sitemap.xml:11-12` emits `.Lang` directly. That produces `hreflang="mm"`, which is a country code rather than the Burmese language tag.

Reuse one centralized `mm -> my` mapping in both the head and sitemap, and consider an `x-default` entry.

### P2 — Generic meta descriptions are too long and too repetitive

The site-wide English description in `hugo.toml:14` is 193 characters and is reused on the home, About, Works, Posts, Blood, General, transcript, and 404 pages. Twenty-three rendered descriptions exceed 160 characters. Post summaries are close to the limit but sometimes become 161-163 characters after entity encoding/ellipsis handling.

Write page-specific descriptions for major sections and keep the fallback concise. Do not optimize only for character count; make each description explain the page’s distinct value.

### P2 — Image and deploy weight needs an explicit budget

The deploy output is about 142 MB: approximately 71.6 MB of WebP files and 66.4 MB of PDFs. The source tree is about 295 MB. Three source assets exceed 10 MB, including two roughly 14.5 MB JPEGs. The largest generated image referenced as an `img src` is about 1.74 MB.

This is not all downloaded on each page—lazy loading and `srcset` substantially help—but several gallery pages declare multiple megabytes of local image resources. Recommended actions:

- pre-compress oversized originals while retaining archival masters outside the deploy repository;
- test a lower WebP quality and/or AVIF output for photographic galleries;
- define maximum source dimensions and a per-page image budget;
- add long-lived caching for hashed processed images under `/posts/` and `/blood-records/`, not only `/images/`;
- keep sensitive and archival PDFs out of the public deploy unless they are intentionally downloadable.

### P2 — Build and test versions drift

Local validation used Hugo 0.165.0, while `netlify.toml:6` pins 0.157.0. The Netlify command at line 2 is only `hugo`; it does not run the existing audits.

Pin one Hugo version across local setup, CI, and Netlify, and make deployment depend on the QC command.

### P2 — Universal lazy loading should remain overridable

`layouts/partials/responsive-img.html:34` hard-codes `loading="lazy"` for every image using the partial. The current home portrait is separately coded and correctly eager/high priority, but future above-the-fold images routed through this partial would be delayed.

Add `loading`, `fetchpriority`, and `decoding` arguments with safe defaults, then explicitly mark likely LCP imagery as eager/high priority.

### P2 — Editorial proofreading deserves automation

At least these visible typos remain:

- `content/posts/210319-msc-journal-club/index.md:9`: “presdented”
- `content/posts/220720_moh_ncd/index.md:8`: “indentification”
- `content/posts/220928_ceb_rwd/index.md:8`: “indentification”

Add a lightweight spell-check job with a project dictionary for names, medical terms, and Burmese content exclusions.

## Product and content critique

The first screen is effective. It establishes who the author is, where he works, what data he works with, and the intellectual tension behind the site. That is better than the usual CV-first academic homepage.

The later home page becomes exhaustive: the generated page contains 75 links but only six headings. Completeness serves academic credibility, but the long works timeline, projects, recent works, posts, live media panels, and footer directories compete for attention.

The next content iteration should preserve the two-voice idea while clarifying visitor paths:

1. **Research collaborator:** current themes, selected papers, datasets/methods, contact.
2. **Recruiter or institutional visitor:** role, concise career evidence, CV, publications.
3. **Personal reader:** essays, blood donation, media and photography.

A good experiment is to make the home page show selected evidence rather than the complete bibliography, with Works remaining the authoritative complete record. Measure whether visitors reach a paper, CV, or contact action faster.

## Recommended roadmap

### Next 48 hours

1. Revoke the exposed Simkl token and remove bearer credentials from browser output.
2. Move protected PDFs behind server-side authorization and rotate their paths.
3. Fix Burmese navigation and the broken `realworlddata.pdf` link.
4. Create the initial Git commit only after checking that no secrets or private documents enter history.

### Next week

1. Add `package.json`/lockfile and a single reproducible `qc` command.
2. Stop ignoring `.github/`; add CI for Hugo build, generated-link checking, accessibility, HTML/metadata assertions, and secret scanning.
3. Fix heading levels, 404 robots, sitemap hreflang, and page-specific descriptions.
4. Align the Hugo version across local, CI, and Netlify.

### Next iteration

1. Add desktop/mobile visual-regression screenshots for light, dark, color-blind, English, and Burmese variants.
2. Establish asset and performance budgets; optimize the heaviest galleries.
3. Add structured monitoring for broken links, failed live-data integrations, 404s, and search-console indexing issues.
4. Test the home page with the three visitor tasks above before reducing or reordering content.

## Release acceptance criteria

- Production build exits successfully with zero warnings.
- Generated internal-link checker reports zero broken references in both languages.
- No access token, private document path, password verifier, or secret value appears in public output.
- Direct access to a protected document fails without server-side authorization.
- Burmese navigation never targets an absent localized page.
- Automated accessibility checks pass at the agreed WCAG level; keyboard workflows and reduced motion are manually verified.
- 404 pages are noindex, sitemap language tags are valid, and major pages have distinct descriptions.
- QC runs from a clean checkout without machine-specific absolute paths.

## Audit limitations

This pass executed the Hugo production build and analyzed generated HTML, assets, links, metadata, source templates, CSS, JavaScript, content, and configuration. Pixel-level browser screenshots, live network behavior, and the repository’s Puppeteer/pa11y scripts could not be executed in the current restricted runtime, so the first CI run should include those checks before final visual sign-off.

---

# Response to this evaluation (2026-09-16)

Written after acting on the report. Everything below was verified against the working tree and a production
build on Hugo 0.157.0, the version `netlify.toml` pins. Re-audit against this section rather than the original.

## Two P0s are closed as accepted risks, not as fixes

The Simkl token and the transcript PIN gate are both correct findings. Neither is being changed. The reasoning
is now written down in `docs/accepted-risks.md`, which is the authoritative record, and is cross-referenced from
`assets/js/config.js`, `layouts/_default/protected-document.html`, `docs/js-contract.md` and `README.md`.

**The Simkl token stays public.** It guards a watch history that is already public on the Simkl profile, and the
panel it feeds is decorative. Proxying it would mean adding a serverless function and a deploy secret to an
otherwise fully static site, which costs more than the token protects. The token is treated as disclosed: it is
not reused elsewhere and its scopes are to stay read-only. If Simkl ever issues broader-scoped tokens, the
decision gets revisited. The Unsplash and Last.fm keys are ordinary public client keys and were never in scope.

**The PIN gate stays a deterrent.** The report is right that the salt, verifier and document path are public,
that a numeric PIN falls to offline guessing in seconds, and that `no-store` and `noindex` grant no
authorization. One detail the report did not catch: both transcripts currently share one salt and one verifier,
so a single PIN opens both. The goal was never confidentiality. These are academic transcripts already handed to
employers and universities; the gate exists so they are not casually clickable and not indexed. The rule now
recorded is that nothing genuinely confidential may use this template.

An audit that reports either item again is technically correct and has found nothing new. The useful question is
narrower: are the token's scopes still read-only, and is every document behind the gate still one whose
disclosure would only be unwelcome.

## Fixed and verified

| Finding | Status |
|---|---|
| P1 Burmese navigation targets absent pages | Fixed. New `layouts/partials/lang-link.html` returns the localized URL when the page exists and the English URL plus `hreflang="en"` when it does not. Applied in the masthead, footer, mobile balloon, 404 and home "more" links. Burmese pages now link `/works/` and `/posts/`, marked as a language change. |
| P1 broken `realworlddata.pdf` link | Fixed. The post links `/docs/realworlddata.pdf`, which is where the file builds. |
| P1 quality checks not reproducible | Fixed. `package.json` with pinned `puppeteer`, `axe-core` and `pa11y`, plus a lockfile. Every script now does `require('puppeteer')` and takes `CHROME_PATH` instead of hard-coding one developer's NVM path and `/usr/bin/chromium`. |
| P1 `.github/` ignored | Fixed. The blanket ignore is gone; `node_modules/` is ignored instead. |
| P2 heading levels skip from h1 | Fixed. All fourteen headings across the three posts are now `h2`. |
| P2 404 pages ask to be indexed | Fixed. `head.html` emits `noindex, follow` when `.Kind` is `404`; verified in both `public/404.html` and `public/mm/404.html`. |
| P2 sitemap hreflang uses the site key | Fixed. A shared `layouts/partials/lang-tag.html` maps `mm` to `my` for both the head and the sitemap. `x-default` was added to the sitemap, where it was missing. Output now carries only `my`, `en` and `x-default`. |
| P2 descriptions too long and repetitive | Fixed. Distinct descriptions on About, Works, Posts and Blood; the site-wide English fallback is down from 191 to 127 characters; the summary truncation moved from 160 to 150 so entity encoding cannot push a description over. Pages over 160 characters went from the 23 this report counted to 0; 43 of the 55 pages now carry a distinct description. |
| P2 universal lazy loading not overridable | Fixed. `responsive-img.html` takes `loading`, `fetchpriority` and `decoding` arguments, defaulting to the previous behaviour. |
| P2 visible typos | Fixed. "presdented" and both instances of "indentification". |
| P0 no release baseline | Fixed. Initial commit made after these changes, with `.env`, `node_modules/`, `public/` and `resources/_gen/` excluded. |

New QC tooling, all runnable from a clean checkout:

- `scripts/links.js`, zero dependencies, resolves every internal `href`, `src`, `srcset`, `poster` and `data-src`
  against the built output and honours the `netlify.toml` redirects. Current result is **2593 internal links
  across 56 pages, 0 broken**, in both languages.
- `scripts/a11y.js`, axe-core against WCAG 2.1 AA over fourteen representative pages in light and dark and in
  both languages. Current result is **0 violations across 28 page loads**.
- `.github/workflows/qc.yml` runs build, links and accessibility on every push, with Hugo pinned to 0.157.0.

## Corrections to the report

**The 11 contrast errors pa11y reports on the home page are not defects.** Running axe-core directly returns
**0 violations and 11 incomplete**. pa11y reports axe's "incomplete" bucket as errors. Ten are the SVG year
labels in the output timeline, where axe says the background "could not be determined because element contains
an image node"; the eleventh is the OpenAlex metrics line, where a pseudo element blocks the same lookup.
Measured by hand, the pairings pass: 5.77:1 light and 6.70:1 dark, against a 4.5:1 requirement. `scripts/a11y.js`
now separates violations from unresolved checks for exactly this reason, so the gate stays worth reading.

**Hugo version drift was an artifact of the audit environment, not the repository.** `netlify.toml` pins 0.157.0
and `.env.example` documents matching it locally. The report measured 0.165.0 because that is what was on the
audit machine's PATH. Nothing in the repo needed changing. The Netlify build command did need changing, for a
different reason given below.

**The sitemap already emitted `x-default` in the document head**, at `head.html:23`. Only the sitemap lacked it.

## Findings the report missed

1. **Production was deploying unminified.** `netlify.toml` ran `hugo`, while the README documented
   `hugo --gc --minify` as the production build. Every deploy since the rebuild shipped unminified HTML and
   skipped garbage collection of unused resources. Now fixed.
2. **Both transcripts share one PIN.** Same salt, same verifier in `data/protected_documents.yml`. Recorded in
   `docs/accepted-risks.md` rather than changed, since the gate is a deterrent by choice.
3. **Long-lived caching was missing for processed images under `/works/`**, not only `/posts/` and
   `/blood-records/` as the report noted. All three now have immutable cache headers, which is safe because Hugo
   writes a content hash into every generated filename.

## Not done, and why

- **Asset weight.** The source tree is 283 MB, dominated by 215 MB of content bundles. The largest files are two
  roughly 14 MB JPEGs and a 12.7 MB PDF. These were left untouched: downscaling someone's archival originals is
  lossy and irreversible, and it is their call, not a QC fix. It is worth deciding before the repository grows a
  long history.
- **Visual regression screenshots** across themes, palettes and languages. The tooling exists (`scripts/shot.js`)
  but no baseline is committed.
- **Spell-check job.** The three known typos are fixed; no dictionary-backed job was added.
- **Home page information architecture.** The critique about the home page becoming dense, and the three visitor
  paths, is a content decision rather than a defect, and is left with the author.

## What to check on re-audit

Run `npm ci`, then `npm run qc`, then `npm run serve` and `npm run a11y`. Expect 0 broken links and 0
accessibility violations. Do not treat `npm run a11y:pa11y` output as failures without checking whether axe
classed them as incomplete. Read `docs/accepted-risks.md` before reporting either security item again.
