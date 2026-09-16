#!/usr/bin/env python3
"""
Convert TTF fonts to WOFF2 and update @font-face src in console.css.

USAGE
-----
  conda run -n hugo python scripts/convert_fonts.py

Drops a .woff2 beside each .ttf in static/theme/font/ and
rewrites every @font-face src in console.css to list woff2 first with ttf
as fallback.

Idempotent: already-converted fonts and already-patched CSS lines are skipped.

DEPENDENCIES
------------
  conda run -n hugo pip install "fonttools[woff]"
  (script auto-installs on first run if missing)
"""

import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FONT_DIR   = REPO_ROOT / "static/theme/font"
CSS_FILE   = REPO_ROOT / "assets/css/console.css"
CSS_FONT_PREFIX = "/theme/font/"


def ensure_fonttools():
    try:
        from fontTools.ttLib import TTFont  # noqa: F401
    except ImportError:
        print("[INFO] fonttools not found — installing fonttools[woff]...")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "fonttools[woff]"],
            stdout=subprocess.DEVNULL,
        )
        print("[OK]   fonttools installed.")


def convert_ttf_to_woff2(ttf_path: Path) -> Path:
    from fontTools.ttLib import TTFont

    woff2_path = ttf_path.with_suffix(".woff2")
    if woff2_path.exists():
        print(f"[SKIP] {woff2_path.name} already exists")
        return woff2_path

    font = TTFont(ttf_path)
    font.flavor = "woff2"
    font.save(woff2_path)
    before = ttf_path.stat().st_size
    after  = woff2_path.stat().st_size
    saving = (1 - after / before) * 100
    print(f"[OK]   {ttf_path.name} → {woff2_path.name}  "
          f"({before // 1024}KB → {after // 1024}KB, -{saving:.0f}%)")
    return woff2_path


# Matches a single-source TTF src line inside @font-face, capturing indentation,
# the font filename stem (no extension), and the trailing semicolon.
# Handles optional unicode-range on the same or next lines — we only replace
# the src: line itself.
_SRC_TTF_RE = re.compile(
    r"""
    (?P<indent>[ \t]*)          # leading whitespace
    src:\s*
    url\("(?P<prefix>[^"]+/)    # URL prefix up to last slash
    (?P<stem>[^"]+?)            # filename without extension
    \.ttf"\)\s*format\("truetype"\)
    (?P<semi>\s*;)              # closing semicolon (possibly with whitespace)
    """,
    re.VERBOSE,
)


def patch_css(css_path: Path, font_dir: Path) -> None:
    text = css_path.read_text(encoding="utf-8")
    changed = 0

    def replacer(m: re.Match) -> str:
        nonlocal changed
        stem   = m.group("stem")
        prefix = m.group("prefix")
        indent = m.group("indent")
        semi   = m.group("semi")

        woff2_path = font_dir / f"{stem}.woff2"
        if not woff2_path.exists():
            return m.group(0)  # no woff2 yet — leave untouched

        # Already patched if the original match text contains woff2 (shouldn't
        # happen since the regex only matches the ttf-only form, but guard anyway)
        replacement = (
            f'{indent}src: url("{prefix}{stem}.woff2") format("woff2"),\n'
            f'{indent}     url("{prefix}{stem}.ttf") format("truetype"){semi}'
        )
        changed += 1
        return replacement

    new_text = _SRC_TTF_RE.sub(replacer, text)

    if changed:
        css_path.write_text(new_text, encoding="utf-8")
        print(f"[OK]   console.css — {changed} src line(s) updated to woff2+ttf")
    else:
        print("[SKIP] console.css already fully patched")


def main():
    ensure_fonttools()

    ttf_files = sorted(FONT_DIR.glob("*.ttf"))
    if not ttf_files:
        print(f"[WARN] No TTF files found in {FONT_DIR}")
        return

    print(f"\nConverting {len(ttf_files)} font(s) in {FONT_DIR.relative_to(REPO_ROOT)}/\n")
    for ttf in ttf_files:
        convert_ttf_to_woff2(ttf)

    print(f"\nPatching {CSS_FILE.relative_to(REPO_ROOT)}\n")
    patch_css(CSS_FILE, FONT_DIR)
    print("\nDone. Commit the new .woff2 files and the updated console.css.")


if __name__ == "__main__":
    main()
