#!/usr/bin/env bash
# Regenerate the subsetted Roboto Mono woff2 files from the full .ttf sources.
#
# Why: the stock Roboto Mono woff2 (~49 KB each) carries Cyrillic and other
# blocks the site never renders. Keeping Latin, Latin Extended, Greek (stats
# symbols), general punctuation, currency, letterlike, arrows, math operators,
# box-drawing, block elements (research.js bars), geometric shapes and
# dingbats cuts each face to ~29 KB. Glyphs outside these ranges fall back to
# the next font in the stack — nothing breaks, it just isn't Roboto Mono.
#
# The Burmese handwriting font (Thit_Sar_Shwe_Si) is NOT subsetted: it is
# already Myanmar-only and subsetting saved <3%.
#
# Requires fonttools (`pip install "fonttools[woff]"`; pyftsubset on PATH).
# convert_fonts.py skips existing woff2 files, so rerun THIS script after any
# Roboto Mono .ttf refresh, never convert_fonts.py alone.
set -euo pipefail

FONT_DIR="$(cd "$(dirname "$0")/.." && pwd)/static/theme/font"
RANGES="U+0000-024F,U+0370-03FF,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2200-22FF,U+2300-23FF,U+2500-257F,U+2580-259F,U+25A0-25FF,U+2600-26FF,U+2700-27BF,U+E000-F8FF,U+FB00-FB06,U+FE0F,U+FFFD"

for face in Regular Italic Bold BoldItalic; do
  src="$FONT_DIR/RobotoMono-$face.ttf"
  out="$FONT_DIR/RobotoMono-$face.woff2"
  pyftsubset "$src" \
    --unicodes="$RANGES" \
    --layout-features='*' \
    --flavor=woff2 \
    --output-file="$out"
  printf '%-28s %s\n' "$(basename "$out")" "$(du -h "$out" | cut -f1)"
done
