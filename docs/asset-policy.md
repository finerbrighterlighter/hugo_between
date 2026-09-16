# Large binary assets: an open decision

Status: **undecided.** This file exists so the choice is made deliberately rather than by accident, while the
history is still short enough that any of the options is cheap.

## Where things stand

| | |
|---|---|
| Source tree, excluding `public/` and `node_modules/` | 284 MB |
| Packed Git objects after the first commit | 268 MB |
| `content/` | 215 MB |
| `static/` | 67 MB |
| Largest single files | two JPEGs near 14 MB, one PDF at 12.7 MB |

Every one of those bytes is now in history. Git stores each version of a binary in full, so re-exporting one
14 MB photograph adds another 14 MB forever. Text files do not behave this way, which is why a repository full
of source code stays small and this one will not.

GitHub warns above 1 GB and pushes back hard above 5 GB. Nothing is broken today. The question is what the
tenth year of this site looks like.

## The three options

**1. Keep everything in ordinary Git.** Simplest, and nothing to learn. A clone costs 268 MB today and only
grows. Fine if the photographs are essentially final and will not be re-exported.

**2. Git LFS for images and PDFs.** The repository keeps pointers; the binaries live in LFS storage. Clones get
small and re-exports stop compounding. Costs: contributors need `git-lfs` installed, Netlify needs LFS support
enabled for the build, and GitHub's free LFS quota is 1 GB of storage and 1 GB of bandwidth a month, which this
site would exceed. Converting existing history means a rewrite, which is why doing it early matters.

**3. Keep archival masters outside the repository entirely.** Commit only what the site actually serves: the
web-sized derivatives. Full-resolution originals live in object storage or a backup drive. This is the smallest
repository and the clearest separation, and it is the one the earlier QC pass was pointing at when it suggested
pre-compressing oversized originals while "retaining archival masters outside the deploy repository".

## Recommendation

**Option 3, with a size ceiling enforced in CI.** The site never serves a 14 MB JPEG; Hugo resizes everything to
at most 1600px. The masters are in the repository only because that is where they landed, not because anything
needs them there. Downscaling the handful of oversized originals to something like 2560px on the long edge would
cut `content/` substantially while leaving every rendered page pixel-identical, and a CI check rejecting new
source images above a few megabytes would keep it that way.

This was deliberately **not** done as part of QC. Downscaling someone's archival originals is lossy and
irreversible, and which files count as masters worth keeping is the author's call, not a quality gate's.

## What to do next

1. Decide whether the full-resolution originals in `content/` are masters or merely large copies of files that
   exist elsewhere.
2. If they exist elsewhere, downscale the ones over about 4 MB and record the ceiling here.
3. If they do not, either move them out of the repository first or accept option 1 knowingly and write that
   down here instead.
4. Whatever is chosen, add the corresponding check to `scripts/qc.js` so the decision holds without anyone
   having to remember it.
