---
# Template only.
# draft: true keeps it out of normal builds; private: true marks intent clearly;
# build.render/list never ensures it does not generate or appear anywhere.
draft: true
private: true
build:
  render: never
  list: never

title: "Example Post Title"

# Post date. Use local date or full timestamp if needed.
date: 2026-01-01

# Public permalink. Folder name can stay organizational/date-prefixed.
url: "/posts/example_slug/"

# Optional short excerpt for list views and SEO/social previews.
# If omitted, posts fall back to .Summary.
description: "One-sentence summary used in lists and meta previews."

# Optional label shown under the title on the post page.
# Common values: a place/event for academic posts, or Personal update.
company: "Mahidol University, Thailand"

# Optional. true = load KaTeX assets for $inline$ and $$block$$ math.
math: false
# Optional. true = load Mermaid assets for diagrams in ```mermaid blocks.
mermaid: false

# Optional bundle-local social preview image for og:image and twitter:image.
# Expected location: content/posts/YYYMMDD-example-name/cover.webp
# If omitted or not found, the site falls back to /general/og_image.webp.
image: "cover.webp"
---

Opening paragraph goes here. This first section usually becomes the summary source.

<!--more-->

## Structure

Continue with the body after the summary break.

- Use rooted internal links like [/posts/phd_journal_club/](/posts/phd_journal_club/)
- Keep the opening paragraph tight if you want a clean fallback summary
- Put bundle-local assets beside this file when using `image:` or gallery shortcodes

## Optional Math

Set `math: true` in front matter before using inline math like $HR = 0.60$ or display math:

$$
p_{TTR} = \max(p_{RCT}, p_{RWE})
$$

## Bundle Assets

If you set `image: "cover.webp"`, the file should live at:

`content/posts/YYYMMDD-example-name/cover.webp`

## Draft Vs Private

- `draft: true` keeps a template or unfinished post out of normal builds
- `private: true` is useful for real posts you want rendered but hidden from discovery
- This example uses both, plus `build.render/list never`, so it stays template-only
