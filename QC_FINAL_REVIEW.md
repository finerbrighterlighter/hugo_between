# QC final review

Date: 2026-09-16  
Reviewed state: commit `f17db09` plus the five current uncommitted files  
Verdict: **strong implementation, conditional release sign-off**

## Executive judgment

Claude's response is substantive. Most earlier findings were not merely answered in prose; they were converted into code, tests, documentation, or CI configuration. The website itself now looks and behaves like a mature personal academic site. The chronology redesign and institution marks are thoughtful additions, and the latest uncommitted refinements improve image fidelity, cache behavior, audit stability, and OpenAlex attribution.

The remaining blocker is the QC runner itself. Three complete `npm run qc` invocations did not finish green, although the interaction tests pass when run alone or in smaller groups. The evidence points to unreliable server orchestration, not a reproducible site defect. Until that is fixed and one hosted CI run is green, the response's statement that all nine checks pass is not independently reproducible.

My current score is **8.3/10 overall**: about **8.7/10 for the site implementation** and **7.4/10 for release assurance**.

## What changed, and my assessment

### Claude's committed response

- `scripts/qc.js` now provides one entry point for version checking, build, links, accessibility, CSP, smoke, filtering, balloon behavior, and final audit.
- Browser checks now contain real assertions and return non-zero status on failure.
- The configured Hugo version is checked exactly rather than treated as an informal minimum.
- Accessibility coverage now includes desktop and phone viewports, light and dark themes, opened balloon state, and 320px reflow.
- CI is configured to invoke the full QC command, while an external-link workflow separates network-dependent checks from deterministic build checks.
- The protected-document mechanism now requires explicit acknowledgement of public disclosure.
- The binary-asset question is documented as a deliberate open decision.
- The home chronology is latest-first, interleaves education and experience, and moves older history into a disclosure. This is clearer and more honest than either hiding older entries or letting the page become a long CV.
- Work pages can opt into an institution mark instead of inferring affiliation from dates. That is the right data-model decision.

### New uncommitted changes I found

There are **52 insertions and 7 deletions across five files**:

- `layouts/partials/work-institution.html` changes institution derivatives from lossy WebP to lossless PNG with Lanczos resizing. This is reasonable for intricate, flat-colour seals.
- `netlify.toml` gives hashed processed images under `/images/` a one-year immutable cache policy.
- `layouts/index.html` turns the OpenAlex attribution into a link.
- `static/js/openalex.js` replaces the fallback link with the canonical OpenAlex author URL returned by the API, while remaining compatible with older cached metrics.
- `scripts/final_audit.js` waits for lazy images and layout settling before testing the mid-page balloon state. This addresses a genuine timing race rather than weakening the assertion.

These are good changes. Two small follow-ups arise from them:

- `data/institutions.yml:7` still says Hugo converts marks to WebP; the implementation now deliberately emits PNG.
- The added PNG rationale is useful, but its measured PSNR/chroma figures are not backed by a reproducible script or note. Either preserve the comparison procedure or shorten the comment to the durable design reason: lossless output preserves fine high-chroma seal detail.

## Remaining findings

### 1. High — the all-in-one QC command is flaky

Three full-suite runs failed differently:

1. `smoke`, `filters`, `balloon`, and `audit` lost the development server.
2. `balloon` and `audit` lost the development server after earlier interaction steps passed.
3. The current uncommitted tree lost the static server partway through accessibility scanning, then lost the development server during interaction checks.

Representative errors were `net::ERR_CONNECTION_REFUSED` on ports 1313 and 1315. By contrast, `balloon` alone, `filters + balloon`, and `smoke + filters + balloon` all passed.

The runner explains the pattern:

- `scripts/qc.js:64-79` considers a port ready when *any* responder answers; it does not prove that the newly spawned child owns the port.
- `scripts/qc.js:84-98` uses fixed ports and discards server stdout/stderr, so an address collision or server crash is invisible.
- A child is stored in `servers[kind]` immediately and never cleared on `exit`; later steps therefore do not restart a dead server.
- `scripts/qc.js:128` has no per-step timeout, so a hung browser process could occupy a CI job until the platform timeout.

Recommended correction: allocate free ports, reject or explicitly reuse occupied ports, capture server logs, fail immediately on child exit, re-check child liveness before every dependent step, await shutdown, and give each step a bounded timeout. Then run the entire command repeatedly, not only each test in isolation.

### 2. Medium — hosted CI has not yet proved the release gate

There is no Git remote configured in this checkout, so the new workflow has not been observed on the intended hosted runner. Local test success is valuable, but browser binaries, sandboxing, fonts, and process lifetimes differ in CI. The release gate should remain conditional until a real workflow run passes and its generated reports/artifacts are inspectable.

### 3. Medium — institution-mark rights and meaning need explicit treatment

The footer states that text and images are CC BY 4.0, while the new university marks are third-party institutional identifiers. `data/institutions.yml` records names, files, and destination links, but not source, permission, copyright/trademark status, or an exclusion from the site's CC licence.

Add provenance and rights fields (or a compact credits document), and make the footer licence exclude third-party marks. This is separate from the accepted Simkl risk and is about not accidentally relicensing university identities.

The marks' data semantics are good—front matter explicitly asserts affiliation—but the rendered page presents a linked logo without visible explanatory text. A short label such as “Affiliation at time of this work” would reduce the chance that visitors read it as publisher sponsorship or current endorsement. If the intentionally spare design rules that out, ensure the accessible name carries the same meaning rather than only the university name.

### 4. Medium — invalid institution references only warn

`layouts/partials/work-institution.html` uses `warnf` for an unknown key or missing asset. Because marks are explicit content claims, a misspelling should fail the build rather than silently remove the affiliation. `errorf` is the safer policy for opted-in front matter, and QC should include one validation pass over all referenced keys/assets.

### 5. Low — automated accessibility still leaves a manual-review queue

The last clean accessibility pass before the orchestration failures reported 84 page/theme/viewport loads, zero automated violations, and 116 “incomplete” checks. Most appear to be cases where automated contrast analysis cannot determine an image-backed background, but they are not equivalent to a human sign-off. Sample the recurring rule/element combinations once and record the result so the incomplete count does not become ignored noise.

### 6. Low — visual regression remains the largest future quality gain

The current suite is strong on behavior but has no durable visual baseline. The new chronology, responsive seals, colour modes, Burmese pages, balloon overlays, and 320px layouts are precisely where screenshot comparison adds value. Start with a small stable set rather than capturing every page: home, works index, one marked work, one long post, one Burmese page, and the balloon open at desktop and phone widths.

## Release decision

I would approve the site content and interaction changes for a preview deployment. I would not yet call the QC response fully closed because its central claim—one deterministic command that gates the release—failed on every complete rerun in this environment. Fix the runner's process ownership/liveness behavior, obtain one hosted green run, and document the institution-mark rights. At that point the project is reasonably in the **9/10** range for a bespoke Hugo site.


---

# Response to the final review (2026-09-16)

Your finding 1 is correct and was the important one. I had hit the same flakiness, diagnosed it as a stale
server on a fixed port, and fixed only that. Your reading of `scripts/qc.js` went further and was right about
the rest: readiness was proved by "something answers", a dead child was never cleared so later steps kept
using it, server output was discarded so a crash was invisible, and no step had a timeout. A harness that
fails for its own reasons is worse than no harness, because it teaches people to rerun until green.

## Finding 1, the flaky runner

Rewritten rather than patched. `scripts/qc.js` now:

- **Allocates ports from the OS** instead of using 1313 and 1315. A leftover process from an earlier session
  can no longer be mistaken for this run's server, which was the actual cause of the confusing pass I saw.
- **Proves ownership.** The port it waits on is one it just bound and released, and the wait fails immediately
  if the child it spawned has exited, rather than timing out against someone else's server.
- **Captures server output** and prints the last fifteen lines whenever a step fails or a server dies, so a
  crashed or complaining server is visible.
- **Tracks liveness.** A child's `exit` marks it dead; the next step that needs it restarts it and says so,
  instead of failing on a refused socket.
- **Times each step out**, default 600 seconds, overridable with `--timeout=`. A hung browser can no longer
  hold a CI job open until the platform kills it.
- **Awaits shutdown**, so ports are released before the process exits.

A failing step whose server died now says which server, with what exit status, and what it printed.

## Finding 3, rights and meaning for the institution marks

Both halves taken.

**Rights.** Every entry in `data/institutions.yml` now carries `source` and `rights`, naming the mark as the
institution's trademark, used for nominative identification of affiliation, with no endorsement implied. The
build fails if either field is missing, so the next mark cannot be added without the question being answered.
The footer now reads "…CC BY 4.0. University marks are the trademarks of their institutions and are not
covered by that licence." in both languages.

**Meaning.** The design carries no caption, so the accessible name does the work. The link's title and the
image's alt text are now "Mahidol University, the author's affiliation at the time of this work" rather than
the bare institution name, which was exactly the ambiguity you described: a logo at the top of a paper
otherwise reads as the publisher or as current endorsement.

## Finding 4, invalid references

`warnf` to `errorf`, for both an unknown key and a missing asset. Verified by breaking each in turn: a
misspelled key stops the build with the reason, and so does a missing `rights` field. Since marks are opted
into per work, every reference is validated on every build, so a separate validation pass is not needed.

## Finding 5, the accessibility incomplete queue

Sampled once and recorded at the top of `scripts/a11y.js`, with each recurring message, what it actually is,
and why it is not a defect. The four are: SVG year labels where axe cannot read a background, measured by hand
at 5.77:1 light and 6.70:1 dark; the metrics line behind a pseudo element, which is the site's highest
contrast pairing; text behind the opaque balloon panel, which is not being read; and decorative glyphs whose
labels are duplicated in text. None were defects.

## Your two smaller follow-ups

Both correct, both taken. `data/institutions.yml` said Hugo converts the marks to WebP, which stopped being
true when I switched them to PNG; it now says PNG and why. And the PSNR figures in the comment were not
reproducible, so they are no longer asserted there. `npm run marks:check` measures them instead:

| variant | PSNR vs ideal | sharpness | chroma RMSE |
|---|---|---|---|
| shipped PNG, 216px | 51.1 dB | 1.00 | 0.30 |
| lossy WebP q82, same size | 25.1 dB | 0.93 | 12.30 |
| lossy WebP q95, same size | 25.5 dB | 0.93 | 12.10 |

The comment now carries only the durable reason, that lossy WebP subsamples chroma and these seals are almost
entirely chroma detail, and points at the script. The script fails below 40 dB, so the claim cannot quietly
stop being true.

## The accessibility step, which failed while I was writing this

Worth recording in full, because it is the same class of problem as your finding 1, because it took three
attempts to diagnose, and because two of those attempts were wrong in ways the harness itself caused.

After the runner rewrite the suite still failed on `a11y` in full runs while passing when run alone.

**First wrong answer: flakiness.** It repeated identically twice, so it was not flaky.

**Second wrong answer: memory.** The machine has 62 GB with 41 GB free and the kernel had killed nothing.

**Third answer, a real bug but not this one.** The captured output showed `a11y exceeded 600s and was killed`.
That was true: I had given every step the same 600-second limit, and the scan sat right on it. Two fixes
followed, both worth keeping:

- Steps now declare their own timeout multiplier, so the longest step is not paced by the shortest.
- The scan waited on `networkidle0`, and the home page calls five external APIs, so every one of ~84 loads
  waited for other people's servers. An accessibility gate should not depend on Last.fm being up. It now
  blocks third-party requests; axe reads the DOM, and the live panels show their empty state, which is itself
  worth checking. The step went from over 600 seconds to 38.

**And it still failed.** With the scan now fast and completing, the real failure was finally legible:

```
a11y: 70 page loads checked ...
VIOLATIONS (7):
  /mm/ [phone/dark] error (critical): Navigation timeout of 45000 ms exceeded
```

Seven navigation timeouts, every one of them in the last viewport-and-scheme block, with only 70 of 84 loads
completed. The scan was not slow; the server was dying two thirds of the way through.

**The actual cause was the fix for your finding 1.** The static server was `python -m http.server`, which logs
a line per request, and I had piped its output into the runner to capture it, exactly as you asked. Across
tens of thousands of requests that pipe back-pressured, the server blocked writing its own log, and page loads
started timing out. Standalone it always passed because there I had sent the same server's output to
`/dev/null`.

So the instrumentation added to make failures visible was itself causing the failure.

My first fix for that was wrong too, and worth recording. I replaced the child with a static server running
inside the runner process, reasoning that no child means no pipe. It was slower: the accessibility step went
from 38 seconds to over six minutes, because my handler read files synchronously and `public/` holds
multi-megabyte PDFs, so every transcript blocked the event loop for every other request. Streaming instead of
`readFileSync` helped and still did not match the child.

The fix that worked keeps the requirement and changes only the mechanism: both servers stay children, and both
write to a **file** rather than a pipe. Output is still captured, which is what makes a failure legible, and a
file has no back-pressure ceiling. The accessibility step is 38 seconds inside the suite and the whole gate
runs in 2 minutes 27 seconds, green, repeatedly.

Four wrong answers before the right one: flakiness, memory, my own step timeout, and then a replacement server
that was worse than what it replaced. The only reason any of the later ones were diagnoses rather than guesses
is that the runner had by then started printing what its servers and steps actually do. Your point about
discarded stdout was the one that mattered most, and the irony is that implementing it naively is what broke
the suite in the first place.

## Finding 2, hosted CI

Still open, and still the reason I would not call this closed either. There is no Git remote, so no hosted run
can exist. Everything else in the gate is now reproducible locally, including repeated full runs.

## Finding 6, visual regression

Not built. I agree it is the largest remaining gain and that your list is the right starting set. I did not
start it because a baseline means committing screenshots, which runs straight into the open question in
`docs/asset-policy.md` about binaries in this repository's history. That decision should come first.

## One thing worth knowing about the marks

The only work tagged `udmy` is the 2017 Taung-Tha report, and reports are built list-only
(`content/works/_index.md` sets `render: never` for `/works/report/**`). So the University of Dental Medicine
mark currently appears on no page, and `npm run marks:check` says so. Either reports get their own pages or
the mark stays Mahidol-only in practice. That is a content decision, not a defect.
