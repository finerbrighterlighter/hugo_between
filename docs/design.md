# htunteza.com — design notes (2026 redesign, "Between")

Repository: `~/GitHub/hugo_between`. Same URLs, same content, same Hugo data as `hugo_console`; nothing else carried over.

## Brief

Redesign from the ground up. The old site (terminal windows, `.sh` panels, a three-column dashboard with a
persistent profile sidebar) is reference material for content and behaviour only. The result must not read as
"the same site with different fonts". First impression wanted: intellectually serious, curious, technically
capable, independent, human. Not a SaaS page, developer tool, dashboard, GitHub profile, faculty page or
AI-portfolio template.

## Directions explored

Three structurally different directions were mocked as static HTML with real content and screenshotted at 1440px
before anything was built (`/scratchpad/mock/a.html`, `b.html`, `c.html` during the session).

| | Structure | Verdict |
|---|---|---|
| **A. Chronicle** | Single column; a left gutter of section labels (Now, Lately, Writing, Research, Before) and a dated bibliography. Italic serif question as hero. | Clean and human, but the label-left/content-right rhythm is the generic editorial-portfolio pattern. Not surprising enough. |
| **B. Two voices** | A vertical spine down the centre of the page. Left voice: clinic, Yangon, the person (blood, music, manga, film, photographs). Right voice: data, Bangkok, the work (cohorts, publications, projects, code). Rows pair the two sides; a pull quote about the duck interrupts the spine. | Chosen. The structure comes from the subject himself (the "between" of the About essay), not from a template. It would look wrong next to the old site. Nothing in it is a card, panel or chart. |
| **C. Monograph** | One long essay with Tufte-style marginal notes carrying the facts and live data; contents as navigation; publications as endnotes. | Most "serious", but the home page would duplicate the About essay and bury what he does now. Kept as the *technique* for essay pages (About, posts): prose column plus a sticky margin. |

None of the three uses a programmer aesthetic. Directions A and C avoid it entirely; B does too.

## The system

**One idea.** The spine. On desktop it is the centre line of the home page, made of column borders so it is
continuous from the portrait to the footer and breaks only where the pull quote crosses it. Every row starts with
one small ochre dot on the spine. On inner pages the same line appears as a short stub above the page title, like a
chapter opener. Below 960px the spine turns: it moves to the left edge, both voices hang from it in sequence and
the row dot follows. Between 700 and 959px the hero alone keeps two columns so the two words still face each other.

**Type.** Newsreader (variable, optical sizes) for everything that is read; Karla (variable) for dates, labels,
navigation and the footer. No monospace anywhere. "Clinic" is set upright at weight 300; "Data" is the italic. Body
19px at ≥1100px, 18px tablet, 17px phone; measure capped at 64ch. Burmese pages swap in Noto Serif Myanmar (body) and
Noto Sans Myanmar (labels), self-hosted like the Latin faces; the display words drop to weight 400 and line-height 1.25.

**Colour.** Paper `#f3f3ef`, ink `#1b1d20`, muted `#5b5f66`, rules `#cfd2cc`, one accent `#8a5a0c` (a dark ochre, the
duck's yellow taken down to text contrast). Blood red `#8f1d21` appears only on the blood page. Dark mode: `#15171a`
paper, `#e9e7e0` ink, `#dcb85a` accent. No gradients, shadows, glass or tinted near-black.

**Structure carries information.** Years sit in their own column because the bibliography and chronologies really
are sequences. Author lists are set the way a reference list sets them (Family Initials, the site owner in bold).
Filters on the works page are words with an underline, grouped under the three facets, not pills. Live data is
written as sentences ("Listening to … by …, on 8 September"; "Cited 33 times across 10 indexed works …") or as
small cover strips with captions; there are no charts, meters or progress bars.

**Motion.** One reversible interaction only: the portrait crossfades to the duck on press (with its quack).
Everything else is a hover underline. `prefers-reduced-motion` removes transitions.

## What each old feature became

| Old | New |
|---|---|
| Sidebar profile | Portrait on the spine; contact and downloads in the colophon footer |
| `publications.sh` (OpenAlex metrics + bar chart) | One sentence under "Published", filled in by `openalex.js` |
| `topics.sh` (tag bars) | Inline topic list with counts, rendered at build time (`partials/topics.html`) |
| `music.sh` | "Listening to …" sentence + "Most played, year by year" playlist covers |
| `manga.sh`, `screen.sh`, `photos.sh` | Cover strips with title and progress captions under "Meanwhile" |
| `github.sh` | Build-time list of repositories under "Code" (`partials/github-repos.html`) |
| `privacy.sh` | One paragraph in the colophon with a "Clear cached data" link |
| Works filter panel (`filters.sh`) | Search field + three facets of underlined tag words, count line, clear link |
| CITE terminal panel (`fetch.sh`) | A `<details>` disclosure with four formats, copy, .bib and .ris |
| Protected transcript with fake blurred paper | Plain PIN form; iframe appears after unlock (a deterrent only, see `docs/accepted-risks.md`) |
| Prompt typing, `[Me]` footer roll, nav bubble, palette picker, Ishihara toggle | Dropped. Light/dark toggle kept in the colophon |
| `/gallery/` layouts | No gallery content exists, so no route is produced; layouts not carried over |

## Review tools

```bash
dotenv run -- hugo server -w                 # dev
hugo --gc --minify                           # production
node scripts/shot.js <url> out.png 1440 900 [full] [light|dark]
node scripts/smoke.js http://127.0.0.1:1313  # exercises every JS feature and prints console errors
pa11y --config scripts/pa11y.json <url>      # axe + htmlcs, WCAG 2 AA
```

## Pass 2 (2026-09-16, refinement, not redesign)

- **Works filter bug.** Two pages claimed `/works/` (`content/works.md` + `content/works/_index.md`) and the filter script was gated on `.Section`, which is empty for the root page; and `.bib li{display:grid}` overrode the browser's `[hidden]` rule so filtered entries stayed visible while the count changed. Fixed: single `_index.md` with `layout: works`, scripts loaded by `.Layout`, global `[hidden]{display:none!important}`. Verified in the rendered page at 1440 and 390 (`scripts/wf.js` pattern: search, facets, combined, clear, `?search=`, counts, no console errors).
- **Phone first viewport** is a plain introduction (name, "Dentist by training, health-data researcher by practice", one paragraph on the current role, link to About). `Clinic | Data` stays from 700px up.
- **Spine used flexibly.** Pairings only where they mean something (Yangon | Bangkok, Working on | Published, Writes | Lately). "What I study" is a full-width neutral interruption. No pull quote: the self-authored duck text is gone from home and from the Burmese About.
- **Homepage pruned.** Blood donation, full project inventory, GitHub repositories, playlists and the topic counts left the home page; projects, code and an "Off duty" paragraph (blood page, Unsplash, Last.fm playlists, AniList, Simkl) now live at the end of About. Blood left primary navigation and is linked from About and the footer.
- **About rewritten** as dated, place-based sections (Yangon 2012–2019; Bangkok 2019–2021; Ramathibodi since 2021; What I am working on) using only facts present in the old About, `cv.yml`, `homepage.yml` and the works pages. Burmese About keeps its text minus the two pull quotes and still needs a native rewrite to match.
- **Burmese typography restored** to the original pairing from `hugo_console`: "Site Handwriting" (Thit Sar Shwe Si + Architects Daughter) for reading text and display words, "Site Handwriting Clear" (Z01-Umoe002) for labels, navigation, dates and the footer; the neat/handwritten body toggle (`mm_font_toggle.js`, `data-mm-font="clear"`, pre-painted in `theme-init.js`) is in the footer tools. Line-height 2, word-spacing .05em, display words at weight 400.
- **Footer split** into contact (write to me, elsewhere, downloads) and a quieter technical row (privacy, licence, build, theme/font/language tools). Language switch sits apart from content navigation in the masthead. ORCID is labelled "ORCID".
- **RSS** is a works-only feed (`layouts/index.xml`); section feeds are disabled. Duck easter egg uses the vector `duck_mascot.svg`. Blood page no longer shows an image-derived donation count.

## Pass 3 (2026-09-16, small refinements)

- **Lately** is one compact row: latest AniList item, latest Simkl item, latest Unsplash photo (one cover each, label, link) under the "Listening to …" sentence; playlists moved to About with a quiet "Listening archive on Last.fm" link on home.
- **Burmese column ownership** fixed: the Yangon/Bangkok split matched `country == "Myanmar"` and `homepage_mm.yml` stores "မြန်မာနိုင်ငံ", so every entry fell to the right. The split now accepts either spelling; checked at 1440, 959, 820, 700 and 390.
- **Phone home shorter** via CSS on `.home` below 700px: two chronology entries per side, three works, two posts, two projects, no figure; "more/all" links carry the rest.
- **What I study** rewritten around the questions (`career_profile.summary` in `homepage.yml`; Burmese falls back to its existing paragraphs). Tooling detail lives in About.
- **Navigation balloon** restored from `hugo_console/static/js/nav_bubble.js` (button + `role="menu"` rows, fade, click‑outside, Escape returns focus) as `static/js/nav_balloon.js` + `partials/nav-balloon.html`, restyled as paper pills with hairline borders, mobile only (<960px), safe‑area aware, arrow/Home/End keys, rows: Top, Home, Works, Posts, About, Blood, language, theme.
- **Figures.** `openalex.js` now renders inline SVG from `counts_by_year`: a compact citations‑per‑year figure on the home "Published" side (hidden on phones) and a fuller works‑marks + citations‑bars figure on `/works/`. CSS variables colour them; an sr‑only table mirrors the data.
- **Primary ribbon** is Works, Posts, language switch. About and Blood live in a footer "Pages" list and in the balloon. Language switch uses the Clear Burmese face whether linked or crossed out. Theme toggle labels are localised through data attributes.

## Pass 4 (2026-09-16, corrections)

- **Yearly OpenAlex chart removed** from home and `/works/` (sparse, ambiguous). In its place, one of the suggested alternatives: per-work citation counts ("Cited n times", zero hidden) written into each Works entry from a single OpenAlex `/works` request for the author, cached like the rest. No figure for now; the metrics sentence stays.
- **Header composition**: Works · Htun Teza · Posts centred as one group; the language switch is a small utility at the top-right edge, absolutely positioned, on every width.
- **Balloon is an in-page navigator.** Rows come from `[data-section]` sections on the home page (Top, Intro or Clinic / Data depending on breakpoint, Yangon / Bangkok, What I study, Working on / Published, Writes / Lately) or from `h2` headings on inner pages (works groups, post and About headings); pages without sections get only Top. A smaller two-column group beneath holds Works, Posts, About, Blood, language, theme. Jumps scroll smoothly, then move focus to the section (`tabindex=-1`, dashed focus ring); the row for the section in view is marked and focused on open. Escape/Home/End/arrows unchanged.

## Pass 5 (2026-09-16, output timeline + light spine variation)

- **Research-output timeline** (`partials/output-timeline.html`): one mark per work, stacked by year, built from Hugo data at build time (no API). Two mark styles only: filled for written outputs (journal, preprint, proceedings, dissertation, report), open for presented ones (talks, posters). Each mark is a link to the work (external source or a year search when the work has no page) with an `aria-label` and `<title>` giving title, kind, year and venue. Placed as a full-width spine interruption between What I study and Working on | Published; hidden below 700px where marks would be illegible. Caption states the encoding only, no interpretation.
- **Writes | Lately** is 2:3 (`.row.asym`); the spine jogs to 40% for that row and its dot follows. All other pairs unchanged; Working on | Published stays paired.

## Pass 6 (2026-09-16, final refinements)

- **Health | Data.** The left word is now Health (i18n `voice_left`); hero copy otherwise as edited in `i18n/`.
- **Current before past.** The chronology row reads Bangkok, now (left) then Yangon, before (right); on phones Bangkok stacks first. About stays chronological. Balloon label follows.
- **Writes | Lately on phones** stacks full-width (the 2:3 grid applies only ≥700px); no horizontal overflow at 375, 390, 430 (`scrollWidth <= clientWidth` audited).
- **Lately images** all 2:3 with `object-fit: cover` (Unsplash cropped at `center 30%`), equal widths.
- **Colour-blind-safe palette** restored from `hugo_console`'s Ishihara toggle as `data-palette="colorblind"` on `<html>`: Okabe & Ito blue accent (`#0072b2` light, `#56b4e9` dark), vermillion for blood, persisted in localStorage `palette`, pre-painted in `theme-init.js`, toggled by `palette.js` from the footer tools (Ishihara icon + label) and the balloon. Works over light and dark. Nothing relies on colour alone: links underlined, focus rings, pressed filters use underline weight, active balloon row has a bar, timeline marks are filled/open.
- **Balloon restyled** for this site: one paper panel with a 1px ink border and hairline rows, Newsreader for section rows, Karla for the two-column site group; square 2.6rem button; active row marked by a 2px bar. Behaviour unchanged.
- Output timeline kept as in pass 5.

## Pass 7 (2026-09-16, balloon simplification)

- Home balloon uses functional labels from `data-section` (i18n `nav_sec_*`): Top, Intro, Experience, Research, Output (tablet only), Current work, Writing & lately. Visible editorial kickers are unchanged, except "Published" became "Recent output" (not everything listed is a publication).
- Panel is one column: section jumps in Newsreader, then a quieter Karla list of Works, Posts and a "More…" disclosure (About, Blood, language, Dark mode / Light mode, Colour-blind mode with a small checkbox mark). The two-column grid is gone. Rows never wrap (`white-space: nowrap` with ellipsis); panel is 14.5rem wide, fits 375px with no overflow.
- Keyboard traversal covers only visible rows and refreshes when More… opens; focus moves into the disclosure on open. Everything else (jump + focus, active row, Escape, Home/End/arrows, safe area, light/dark/colour-blind) unchanged.

## Pass 8 (2026-09-16, phone portrait)

Below 960px the portrait sits astride the top of the spine: its left edge is placed at `var(--spine-x) - .3 × diameter`, so the line enters the circle about 30% in from its left edge and stops at the paper ring; the row carries a negative bottom margin so the circle dips into the space above the name (about 19px clearance kept). The phone spine offset is now 1.1rem at all phone widths (the .5rem override under 520px is gone) so the circle stays inside the viewport.

## Pass 9 (2026-09-16, small copy and phone fixes)

- "What I study" opens with the original sentence verbatim: "understanding when, why, and how routinely collected clinical data, particularly electronic medical records, can be responsibly reused to answer epidemiological and clinical questions."
- Below 700px the large intro name is visually hidden (the `h1` stays for assistive tech); the header already names him. The tagline is promoted to lead the intro at 1.45rem.

## Pass 10 (2026-09-16, location-independent structure)

The experience row is **Now | Before**, split by whether an entry is ongoing (`current: true` in the data, or a time string ending in Present / လက်ရှိ), not by country. A future role, institution or country only adds an entry. Health | Data remains the hero; balloon labels stay functional (Experience, Research, Output, Current work, Writing & lately). The current role shows its detail paragraph inline (first paragraph only on phones); past entries keep the collapsed "show more".

## Pass 11 (2026-09-16, chronology order and work marks)

- **Now | Before read latest first.** Education and experience are interleaved by start year rather than listed
  one after the other, so the column reads as one career instead of two lists. The sort key is the start year
  parsed from the `time` string (`layouts/partials/chron-year.html`, which handles Myanmar digits); entries that
  share a year keep their order from the data file.
- **The tail of a chronology folds into one disclosure.** `chronVisibleLimit` in `hugo.toml` (currently 3) sets
  how many entries stay open; the rest sit behind "N earlier", styled like the existing per-entry "show more".
  This replaces the phone-only rule that silently hid everything past the second entry with no way to reveal it.
  The count is rendered in Myanmar digits on Burmese pages (`layouts/partials/localized-number.html`).
- **Work pages open with an institution mark**, the counterpart to the home portrait: same row spacing, same
  diameter, same paper ring and ink hairline, and the page's hairline leaves its edge the way the spine leaves
  the portrait. A work opts in with `institution: <key>` in front matter; keys live in `data/institutions.yml`.
  It is never inferred from the date, because a logo asserts an affiliation.
- **Timeline marks stay on the site.** A mark links to the work's own page, or, for the conference items and
  reports that are built list-only, to the Works list filtered to that year. It no longer falls back to a
  publisher, mirror or ResearchGate copy.

## Pass 12 (2026-09-16, credits and the colour-blind control)

- **Credits page** at `/general/credits/`, linked from the colophon in both languages. It names the typefaces
  (Newsreader, Karla, Thit Sar Shwe Si, Z01-Umoe002, Architects Daughter), the software (Hugo, KaTeX, Mermaid,
  GoatCounter) and the data sources, with their designers and licences. Every fact on it was read out of the
  files the site ships, including the fonts' own name tables, so it stays true as long as the files do. The
  page exists in English only; the footer link falls back to the English URL with `hreflang` on Burmese pages,
  and adding `credits:` to `i18n/mm.yaml` is all a translation needs.
- **The inactive Ishihara icon is inverted in dark mode.** It is a pure black line drawing on transparency:
  18.9:1 on the light paper and 1.17:1 on the dark one, which is invisible. It is monochrome, so inverting
  loses nothing. The active plate is untouched; it is orange, already reads at 7:1 on dark, and its colour is
  the point.

## Pass 13 (2026-09-18, the print colophon)

The site had a print stylesheet that stripped the masthead, the footer and the spine, which is correct and
which nobody ever saw twice. `layouts/partials/print-colophon.html` fills the space it leaves: the duck as the
printer's mark, one italic line naming the typefaces and who cut them, and a quiet Karla line identifying the
page.

The duck rather than a typographic mark because it is already the site's easter egg, hiding on the portrait,
so it belongs here more than a borrowed asterism would.

The identifying line is deliberately short. A paper's title is long by definition and is already the heading
at the top of the sheet, so the line names the journal instead, falling back to the institution where a page
has no venue; the transcripts carry an `institution` key for exactly this. The address is the section rather
than the deep path, because someone holding the paper wants to know where to start looking, not to retype a
slug. A private section falls back to the site itself.

It is `display: none` on screen, so it reaches neither sighted readers nor assistive technology. It exists for
the one person who prints a page and keeps it, which is the only easter egg this design could have that the
previous terminal-styled site could not.

Everything in it is a proper noun except one connective sentence, so it still reads correctly on a Burmese page
whose translation has not been written; adding `print_colophon` to `i18n/mm.yaml` is all a translation needs.
The Burmese typeface line appears only on Burmese pages.

Fixed while building it: `.balloon` is `position: fixed` and was not in the print hide list, so the mobile
navigation button printed on every sheet.

## Pass 14 (2026-09-18, three small things hidden in plain sight)

- **`/humans.txt`**, the counterpart to the `llms.txt` the site already emits. One plain text file written for
  machines, one written for people, side by side at the root, which is the site's own argument in its simplest
  possible form. Names the typefaces and their designers, what the site is built with, and the thanks. Linked
  from every page with `rel="author"`, which is how the convention is discovered.
- **The closing note in `llms.txt` and `llms-full.txt` now addresses its reader**, who is not a person, and
  points at `humans.txt` as the human half. It is deliberately a courtesy and not an instruction, so that
  nothing parsing the file is being told what to do.
- **The last dot on the spine opens.** Every row draws an ochre dot through `.row::before` as decoration; the
  one closing the last row of the home page is a `<details>` holding a single marginal note, the way a colophon
  sits at the back of a book. No JavaScript: a disclosure is keyboard-operable and announced correctly on its
  own. The visible mark stays 9px like every other dot while the hit area is padded to the 24px tap-target
  floor, and it aligns to the spine, which the asymmetric row moves to 40%. Below 960px it is not shown at all:
  the rows collapse to one column and the spine moves to the left edge, so there is no line down the middle for
  the note to be about. `display: none` rather than a visual hide, so it leaves the accessibility tree and the
  tab order with it.

The note first overlaid the row, which put it on top of the text either side, so it now sits in normal flow and
pushes the footer down instead. It also has to span the row with `grid-column: 1 / -1` rather than `1 / 3`,
because the row collapses to a single column on a phone and asking for a second one creates it. The audit
caught that.

The print colophon's mark now comes from `apple-touch-icon.png` rather than a separate duck file, so changing
identity means replacing the icon set and nothing else. 180px is what a 600 dpi printer wants for a 22pt mark,
and it is a third the weight of the 512px icon.

## Pass 15 — the IELTS figure

Five sittings of the same English test across seven years, sitting unused. The About page draws them rather
than listing them, because the interesting thing is not any one number but how far each skill moved and how
little the reader should trust a quartile drawn from four points.

- **A box plot with every point still on it.** One row per skill plus the overall band, Tukey's hinges, and
  whiskers to the furthest sitting inside 1.5 IQR. Every sitting stays drawn on top as a dot; marks that
  landed on the same band stack into a small pile, and the most recent is solid. With n of four or five, a box
  that hid its points would be a claim the data cannot support, so it never hides them.
- **The band axis is not cropped.** It runs the whole 0–9. The marks bunch in the right-hand third and the
  left two-thirds sit empty, which is what these numbers look like against the scale they are scored on. An
  axis starting at 6 made them look better than they are.
- **The One Skill Retake is shown, not smoothed.** A retake re-tests one component and carries the other
  three over. A carried score is not a measurement, so only the re-sat skill gets a mark from it, plus the
  recomputed overall band. The rows with no open ring are the explanation, and the caption names it.
- **Sittings cluster, they do not stack.** An earlier version gave each sitting its own slot down the row,
  which grew the figure every time a test was added. The pile now compresses inside a fixed row height, so
  another sitting costs nothing.
- **Two drawings, one figure.** Text in an SVG scales with the viewBox, so a single drawing cannot hold
  legible type across a 277px phone column and a 660px essay column — the sizes differ by more than a factor
  of two. `ielts-plot.html` is called twice at two geometries and CSS shows whichever fits; `display:none`
  keeps the other out of the accessibility tree, so only one `aria-label` is ever live.
- **Hover labels are drawn, not delegated.** Each mark and box sits in a group with an oversized invisible hit
  area and its own small label, revealed on hover. A native SVG `<title>` was tried first and rejected: it
  gives the operating system's tooltip, on the operating system's delay, in the operating system's styling.
  The width of a drawn label has to be estimated from its character count, since SVG cannot measure text at
  build time, and is clamped inside the viewBox so a label near the right edge slides left instead of
  clipping. Still no JavaScript.

The words are assembled from the data too. The lead counts the sittings and the years between the first and
last; the caption takes the retake's month and skill from the entry that declares it; the accessible
description reads every band out of `data/ielts.yml`. All three had been typed by hand first, and the
accessible one is exactly the sort that goes stale without anyone noticing. Adding a sitting is now one entry.

The forms themselves are not published and are not in the repository: they carry a candidate ID, a date of
birth and a nationality, none of which the chart needs.
