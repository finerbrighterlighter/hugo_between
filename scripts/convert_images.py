#!/usr/bin/env python3
"""
Convert images to WebP and optionally resize + update references.

USAGE
-----
  # Single file, resize to exact box
  conda run -n hugo python scripts/convert_images.py static/general/profile.jfif --size 320x320 --update-refs

  # Directory, resize proportionally to max width
  conda run -n hugo python scripts/convert_images.py content/posts/my-post/ --width 1200 --update-refs

  # Batch without resizing (format-only)
  conda run -n hugo python scripts/convert_images.py content/posts/ --update-refs

  # Dry-run to preview changes
  conda run -n hugo python scripts/convert_images.py content/posts/ --dry-run

OPTIONS
-------
  --size WxH      Resize to fit within WxH box, maintaining aspect ratio (no upscale)
  --width W       Resize to max width W, maintaining aspect ratio (no upscale)
  --quality N     WebP quality 1–100 (default: 85)
  --keep          Keep original files after conversion (default: keep originals)
  --update-refs   Scan repo text files (.yml, .md, .html, .toml) and replace old filenames
  --dry-run       Preview changes without writing anything

Supported input formats: JPEG, JPG, JFIF, PNG, GIF (static frames only), BMP, TIFF
Already-WebP files are skipped.
"""

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT    = Path(__file__).resolve().parent.parent
INPUT_EXTS   = {".jpg", ".jpeg", ".jfif", ".png", ".gif", ".bmp", ".tiff", ".tif"}
REF_EXTS     = {".yml", ".yaml", ".md", ".html", ".toml", ".js"}
DEFAULT_QUALITY = 85


def ensure_pillow():
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        import subprocess
        print("[INFO] Pillow not found — installing...")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "Pillow"],
            stdout=subprocess.DEVNULL,
        )
        print("[OK]   Pillow installed.")


def convert_image(src: Path, size: tuple | None, max_width: int | None,
                  quality: int, dry_run: bool) -> Path | None:
    """
    Convert src to WebP alongside the original.
    Returns the destination path, or None if skipped.
    size: (W, H) box — image fits within, aspect ratio preserved, no upscale
    max_width: proportional resize to this width, no upscale
    """
    from PIL import Image

    if src.suffix.lower() not in INPUT_EXTS:
        return None

    dest = src.with_suffix(".webp")

    if dest.exists():
        print(f"[SKIP] {src.name} → {dest.name} already exists")
        return None

    if dry_run:
        tag = f"size={size}" if size else (f"width={max_width}" if max_width else "no resize")
        print(f"[DRY]  {src}  →  {dest}  ({tag}, q={quality})")
        return dest

    img = Image.open(src).convert("RGB")
    orig_w, orig_h = img.size

    if size:
        target_w, target_h = size
        # fit within box, no upscale
        scale = min(target_w / orig_w, target_h / orig_h, 1.0)
        new_w, new_h = int(orig_w * scale), int(orig_h * scale)
        if (new_w, new_h) != (orig_w, orig_h):
            img = img.resize((new_w, new_h), Image.LANCZOS)
    elif max_width and orig_w > max_width:
        ratio = max_width / orig_w
        img = img.resize((max_width, int(orig_h * ratio)), Image.LANCZOS)

    img.save(dest, "WEBP", quality=quality, method=6)

    before = src.stat().st_size
    after  = dest.stat().st_size
    saving = (1 - after / before) * 100
    dims   = f"{img.size[0]}×{img.size[1]}"
    print(f"[OK]   {src.name} → {dest.name}  "
          f"({before // 1024}KB → {after // 1024}KB, -{saving:.0f}%, {dims})")
    return dest


def find_images(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    return sorted(
        p for p in input_path.rglob("*")
        if p.suffix.lower() in INPUT_EXTS
    )


def update_references(conversions: list[tuple[Path, Path]], dry_run: bool) -> None:
    """
    Replace old image filenames/paths with new WebP ones across repo text files.
    Matches basename and common URL-path forms.
    """
    if not conversions:
        return

    # Build replacement map: pattern → replacement string
    # For each conversion, replace:
    #   - bare filename:     profile.jfif  → profile.webp
    #   - URL path form:     /general/profile.jfif → /general/profile.webp
    patterns = []
    for src, dest in conversions:
        old_name = re.escape(src.name)
        new_name = dest.name
        patterns.append((re.compile(old_name), new_name))

    ref_files = [
        p for p in REPO_ROOT.rglob("*")
        if p.suffix.lower() in REF_EXTS and p.is_file()
        and ".git" not in p.parts
        and "public" not in p.parts
        and "resources/_gen" not in str(p)
    ]

    updated = 0
    for ref_file in ref_files:
        text = ref_file.read_text(encoding="utf-8", errors="ignore")
        new_text = text
        for pattern, replacement in patterns:
            new_text = pattern.sub(replacement, new_text)

        if new_text != text:
            matches = [p.pattern for p, _ in patterns if p.search(text)]
            if dry_run:
                print(f"[DRY]  refs: {ref_file.relative_to(REPO_ROOT)}  "
                      f"(would replace: {', '.join(matches)})")
            else:
                ref_file.write_text(new_text, encoding="utf-8")
                print(f"[OK]   refs: {ref_file.relative_to(REPO_ROOT)}  "
                      f"(replaced: {', '.join(matches)})")
            updated += 1

    if updated == 0:
        print("[INFO] No references found to update")


def main():
    parser = argparse.ArgumentParser(
        description="Convert images to WebP with optional resize and reference update.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", help="File or directory to convert")
    parser.add_argument("--size",  help="Fit within WxH box, e.g. 320x320 (no upscale)")
    parser.add_argument("--width", type=int, help="Max width, proportional resize (no upscale)")
    parser.add_argument("--quality", type=int, default=DEFAULT_QUALITY,
                        help=f"WebP quality 1–100 (default: {DEFAULT_QUALITY})")
    parser.add_argument("--update-refs", action="store_true",
                        help="Update filename references in .yml/.md/.html/.toml files")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without writing anything")
    args = parser.parse_args()

    ensure_pillow()

    size = None
    if args.size:
        try:
            w, h = args.size.lower().split("x")
            size = (int(w), int(h))
        except ValueError:
            print(f"[ERR]  --size must be WxH, e.g. 320x320. Got: {args.size}")
            sys.exit(1)

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"[ERR]  Path not found: {input_path}")
        sys.exit(1)

    images = find_images(input_path)
    if not images:
        print(f"[WARN] No convertible images found in {input_path}")
        return

    label = "image" if len(images) == 1 else "images"
    print(f"\nConverting {len(images)} {label}\n")

    conversions = []
    for img_path in images:
        dest = convert_image(img_path, size, args.width, args.quality, args.dry_run)
        if dest is not None:
            conversions.append((img_path, dest))

    if args.update_refs and conversions:
        print(f"\nUpdating references for {len(conversions)} conversion(s)\n")
        update_references(conversions, args.dry_run)

    if args.dry_run:
        print("\nDry run complete — no files written.")
    else:
        print(f"\nDone. {len(conversions)} file(s) converted.")
        if conversions and not args.update_refs:
            print("Tip: re-run with --update-refs to update filename references in repo files.")


if __name__ == "__main__":
    main()
