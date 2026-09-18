# Large binary assets

Status: **decided, 2026-09-18.** Repository size is accepted. What is watched is the weight of the pages a
visitor actually loads.

## The decision

Binaries stay in ordinary Git. No LFS, no external object store, no rewriting of history. The repository is
about 268 MB packed and will grow as photographs are added, and that is accepted: it costs a one-off clone and
nothing else. Nobody downloads the repository to read the site.

What matters is the deployed page. That is measured below and is in good shape, and it is the number to defend.

## Measured, 2026-09-18

The deploy directory is 137 MB, of which 46.5 MB is PDFs and 42.7 MB is generated WebP variants. Almost none
of it is fetched by any one visitor, because Hugo emits a `srcset` ladder and the templates lazy-load
everything below the fold.

What a visitor actually transfers:

| Page | Requests | Transferred | Largest single item |
|---|---:|---:|---:|
| Home | 32 | 0.46 MB | 143 KB |
| Works | 22 | 0.40 MB | 143 KB |
| Posts | 18 | 0.23 MB | 129 KB |
| The heaviest post | 49 | 0.54 MB | 129 KB |
| Blood | 37 | 0.47 MB | 129 KB |
| A paper | 23 | 0.45 MB | 143 KB |

No page exceeds 0.6 MB and no single asset exceeds 143 KB, on a site whose source tree holds several 14 MB
JPEGs. The image pipeline is doing its job.

## What to watch

The number that would signal trouble is a page's transferred weight, not the size of the repository or of
`public/`. Two rules follow:

- **Never reference a source image directly.** Everything goes through `layouts/partials/responsive-img.html`
  or the gallery shortcode, which resize and emit WebP. A raw `<img src>` pointing at a 14 MB original would
  ship all 14 MB, and nothing in the build would stop it.
- **PDFs are the exception and are linked, not embedded.** A reader who clicks a 12 MB itinerary has chosen to.
  They are the largest thing in the deploy and cost nothing until asked for.

If a page ever crosses about 1 MB transferred, the cause will be either a source image that escaped the
pipeline or a gallery that outgrew lazy loading. Re-measure with the browser's network panel, or the script
used above, before changing anything.

## What was rejected, and why

**Git LFS.** Would shrink clones but adds a tool every contributor must install, needs Netlify support enabled
for builds, and exceeds GitHub's free 1 GB storage and bandwidth allowance for a site this size. The problem it
solves is not one that hurts here.

**Archival masters outside the repository.** The cleanest repository, but it splits the site's history across
two places and means the originals can go missing without anything noticing. Keeping them beside the content
they belong to is worth the bytes.

**Downscaling the oversized originals.** Lossy and irreversible, for no gain on the number that matters: those
files are never served. They exist so a future export can be larger, not smaller.
