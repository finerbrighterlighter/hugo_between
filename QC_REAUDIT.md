# QC Re-audit after Claude's response

Date: 2026-09-16

## Updated judgment

Claude's response is credible and the remediation is substantial. I independently verified the main fixes against the current source and generated output.

The site moves from **7.1/10, not ready for unconditional sign-off** to approximately **8.3/10, conditional sign-off**. The remaining conditions are mostly about proving the new automation in a real CI run and turning diagnostic browser scripts into actual gates.

The public Simkl token is treated as a closed, user-accepted risk and is not reconsidered here.

## Independently verified

- The working tree is clean and now has an initial commit (`4e3b8e0`).
- `npm run qc` passes locally.
- Hugo builds successfully with zero reported warnings or errors in the local environment.
- The generated-link audit checks 56 pages and 2,593 internal links with zero broken links.
- Burmese navigation now falls back to `/works/` and `/posts/` with `hreflang="en"`; it no longer invents absent `/mm/works/` or `/mm/posts/` pages.
- All 55 substantive rendered pages have exactly one `h1`, no heading-level jumps, and a non-empty description no longer than 160 characters.
- Both generated 404 pages emit `noindex, follow`.
- Language sitemaps use only `en`, `my`, and `x-default` hreflang values.
- No developer-specific `/home/finer/...` or `/usr/bin/chromium` paths remain in source JavaScript/templates.
- Netlify now runs `hugo --gc --minify` and adds immutable cache rules for hashed processed images under `/posts/`, `/blood-records/`, and `/works/`.
- `.github/` is no longer ignored; the workflow and pinned npm lockfile are committed.
- The responsive-image partial now permits callers to override loading, decoding, and fetch priority.

## Additional comments and concerns

### 1. `npm run qc` is not yet the complete QC suite

`package.json:12` defines `qc` as only the build plus internal-link check. Accessibility is a separate command, and the smoke, CSP, balloon-navigation, works-filter, and final-audit scripts are also separate.

That makes the command name stronger than its guarantee. A local contributor can run `npm run qc`, receive a green result, and still miss interaction, accessibility, CSP, or console failures.

Recommended change: create a CI-oriented orchestration command that builds, starts the preview server, waits for readiness, and runs links, axe, smoke, CSP, balloon, and works-filter tests. Keep a faster `qc:static` command if useful.

### 2. Several browser “tests” report errors without failing

The current `scripts/smoke.js`, `scripts/final_audit.js`, `scripts/balloon_test.js`, and `scripts/works_filter_test.js` print accumulated errors but do not set a non-zero exit code when those arrays are non-empty. Only a thrown top-level exception reliably fails some of them.

These are useful diagnostic probes, but they are not yet CI assertions. Add explicit expected-value assertions and set `process.exitCode = 1` whenever console errors, page errors, request failures, or behavior mismatches are found.

### 3. CI does not run most of the interaction checks

`.github/workflows/qc.yml` runs the production build, internal-link audit, and axe accessibility scan. It does not run `smoke`, `csp`, `balloon_test`, `works_filter_test`, or `final_audit`.

This matters because the site's most custom behavior—the mobile navigation balloon, filter state/URL synchronization, live panels, and CSP compatibility—lives outside what a static build and axe scan can prove.

Recommended change: first make those scripts fail correctly, then add the stable ones to CI.

### 4. Accessibility automation is desktop-only

`scripts/a11y.js:85` fixes the viewport at 1280 × 1024. The site's navigation changes materially below 960 px, where the balloon becomes the main navigation mechanism. That mobile interaction is therefore not covered by the axe run, and the dedicated balloon test is not in CI.

Add at least one phone viewport, ideally around 390 × 844, in both light and dark modes. Include keyboard traversal, focus return, escape behavior, menu naming, and zoom/reflow checks.

### 5. The CI workflow exists but has not been exercised in this repository

The Git repository has no configured remote and only the local initial commit. Therefore, the GitHub Actions workflow is a sound definition but not yet evidence of a passing hosted run. The local machine also has Hugo 0.165.0, while CI and Netlify pin 0.157.0.

Before release sign-off, push to the intended remote and confirm a green workflow using the pinned Hugo version. Consider a local version manager file or a small version assertion so `npm run build` cannot silently use a different Hugo release.

### 6. The transcript deterrent needs an operational boundary

Claude's accepted-risk document correctly states that the PIN gate is not access control. That is a legitimate product decision for documents whose disclosure is merely unwelcome.

The residual concern is future misuse: the template is still named and presented as “protected,” which can encourage someone to place genuinely confidential material behind it later. Consider renaming the concept to “personal document” or “deterrent gate,” and add an explicit data flag such as `accepted_public_disclosure: true` that the build requires for every gated document.

This does not ask for real authentication; it turns the accepted-risk rule into an enforceable guardrail.

### 7. Decide the binary-asset strategy now, before history grows

Claude was right not to destructively downscale archival originals during QC. The unresolved issue is repository economics: the source is roughly 283 MB, with about 215 MB in content bundles, and the first commit permanently establishes that baseline.

If archival masters must be retained, Git LFS or separate object/archive storage is preferable to repeatedly versioning multi-megabyte JPEGs and PDFs in ordinary Git. This is cheapest to decide while history contains only one commit.

### 8. External integrity is not monitored

The internal-link checker is now strong, but the site depends heavily on DOI links, institutional pages, publication PDFs, GitHub metadata, and several live APIs. Internal correctness will not detect link rot or upstream behavior changes.

Add a scheduled, non-blocking external-link/API health job with rate limits and an allowlist. Treat transient upstream failures as a report rather than a deploy blocker.

## Revised release checklist

Before calling the remediation fully closed:

1. Push the repository and obtain a green hosted CI run on Hugo 0.157.0.
2. Make the browser diagnostic scripts fail on real errors or mismatched behavior.
3. Add the stable interaction and CSP checks to CI.
4. Add a mobile viewport to accessibility coverage.
5. Record the chosen Git/LFS/archive policy for large source assets.

The original correctness findings are otherwise resolved. The remaining work is about strengthening proof and preventing regressions, not redesigning the site.

---

# Response to the re-audit (2026-09-16)

Written after acting on it. Every claim below was verified against the working tree and a production build on
Hugo 0.157.0, the version `netlify.toml` pins. Re-audit against this section.

## The short version

All eight points are addressed. `npm run qc` now means the whole suite and passes end to end. Two genuine
defects turned up that neither audit had found, both in mobile territory this re-audit was right to point at.

```
QC summary
  pass  hugo:check   pass  build     pass  links
  pass  a11y         pass  csp       pass  smoke
  pass  filters      pass  balloon   pass  audit
```

## Point by point

**1. `npm run qc` was weaker than its name.** Fixed. `scripts/qc.js` runs nine steps in order, starts and stops
the servers the browser steps need, and runs every step even after a failure so one run reports everything that
is wrong. `npm run qc:static` keeps the fast build-and-links subset. Flags: `--only=`, `--skip=`, `--bail`.

**2. The browser scripts reported without failing.** Fixed. All four now wire console errors, page errors and
failed requests, assert the values they previously only printed, and set a non-zero exit code. Failures from the
live API hosts are filtered out, because those legitimately vary without keys. The scripts assert relations, not
fixtures, so ordinary content edits do not break them. The non-zero path is proven, not assumed: two assertions
genuinely failed during development and were investigated rather than weakened.

**3. CI did not run the interaction checks.** Fixed. The workflow now calls `npm run qc`, so accessibility,
CSP, smoke, filters, balloon and audit all run on every push. Screenshots upload as an artifact.

**4. Accessibility was desktop-only.** Fixed, and this is where the re-audit earned its keep. `scripts/a11y.js`
now runs desktop and phone, light and dark, in both languages, plus two things axe cannot reach on its own:

- The balloon menu is `hidden` until opened, so the old scan never saw the mobile navigation at all. The phone
  pass now opens the menu and its disclosure, then scans again.
- A reflow check at 320px, WCAG 2.1 AA 1.4.10, which axe does not test.

**5. CI unexercised, and local Hugo drifts from the pin.** The version half is fixed: `scripts/check-hugo.js`
reads `HUGO_VERSION` out of `netlify.toml`, compares it to the Hugo on PATH, requires the extended edition, and
fails with the exact command to use. It is the first step of `qc` and a step in CI. The hosted-run half cannot be
done from here: the repository still has no remote. That remains the one open item before release sign-off.

**6. The deterrent needed an operational boundary.** Fixed, and made enforceable rather than documentary. Every
entry in `data/protected_documents.yml` must now carry `accepted_public_disclosure: true`, the author's explicit
statement that disclosure of that file would be unwelcome but not harmful. The template calls `errorf` without
it, so the build fails. Verified by removing the flag and watching the build stop. The template's own comment
now leads with "Deterrent gate … NOT access control".

**7. Binary-asset strategy.** Documented as an open decision in `docs/asset-policy.md`, with the three options,
the real numbers (284 MB source, 268 MB packed, largest files near 14 MB) and a recommendation: keep archival
masters outside the repository, commit only what the site serves, and enforce a ceiling in CI. Deliberately not
executed. Downscaling someone's archival originals is lossy and irreversible, and which files are masters is the
author's call.

**8. External integrity was not monitored.** Fixed. `scripts/extlinks.js` checks every external URL in the built
site plus the fourteen API origins from the CSP `connect-src`, so a dead upstream is caught even when nothing in
the markup points at it. It reports and never blocks: exit 0 by design. A weekly workflow runs it, writes a
summary to the run page and uploads the report. Rate limiting is per-host serialised with a minimum gap, backs
off on 429 and 5xx, and was tuned against real 429s rather than assumed: `rate-limited` went from 1 to 0.

The first real run covered 239 unique external URLs across 68 hosts, 89% clean, and found a real bug described
below.

## Defects found while doing this work

**Two WCAG failures on phones, now fixed.**

- `aria-pressed` on an element with `role="menuitem"` in the balloon. axe rates this critical; the attribute is
  not allowed on that role. The colour-blind toggle is now a `menuitemcheckbox` with `aria-checked`, and the
  keyboard traversal selector and CSS were updated to match.
- Horizontal overflow at 320px on the home page and the Works list, a 1.4.10 Reflow failure. Both were the same
  bug: grid items keep `min-width: auto`, so they refuse to shrink below their min-content width and push the
  page wider than the viewport. Fixed with `minmax(0, 1fr)` tracks, `min-width: 0` on the items, and
  `overflow-wrap: anywhere` on the long unbreakable strings that caused it, which were repository names, DOIs
  and one "Lately" label. Now clean across 70 page-and-width combinations at 320, 375, 390, 430 and 768.

**A dead link in content.** `…/CEBdatawarehouse/Data/Dimentia` returns 404; the correct spelling `Dementia`
returns 200 and was already used elsewhere in the same file. It was linked from the English and Burmese home
pages. Fixed, along with a malformed YouTube URL missing its `?` and every remaining `http://doi.org` link.

**An inconsistency in the balloon.** Opening the menu mid-page focuses the current section's row, but the
IntersectionObserver then recomputed the highlight from whichever entries happened to fire, so the accent bar
could move off the row that had just been focused. Both paths now use one rule and the observer only triggers a
recompute. This surfaced because a content change shifted scroll positions, which is the regression-catching the
re-audit asked for, working.

## Corrections to the re-audit

**`scripts/csp_check.js` already exited correctly**, with 1 on violations and 2 on a missing policy. The
re-audit named the four scripts that did not, and was right about all four; this is only a note that the fifth
was already fine.

## Still open

1. **No Git remote, so no hosted CI run.** The workflow is defined and every step in it passes locally, but a
   green Actions run cannot exist until the repository is pushed. This is the last item before sign-off.
2. **The binary-asset decision**, in `docs/asset-policy.md`. Cheapest to make now.
3. **No visual-regression baseline.** The scripts take screenshots and CI uploads them; nothing compares them.
