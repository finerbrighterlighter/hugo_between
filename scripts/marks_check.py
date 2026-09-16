#!/usr/bin/env python3
"""marks_check.py — prove the institution marks are rendered faithfully.

The marks are rendered as PNG rather than the site's usual WebP. That looks like an
inconsistency, so this script is the evidence for it: it compares whatever the build
actually emitted against an ideal downscale of the source, and reports the same
numbers for the lossy WebP the site would otherwise have used.

Lossy WebP subsamples chroma. These seals are fine gold lettering on saturated blue,
which is almost entirely chroma detail, so the loss lands exactly where the eye is
looking. The quality setting does not rescue it, which the WebP rows below show.

    python3 scripts/marks_check.py [--min-psnr 40]

Exits 1 if a shipped mark falls below the PSNR floor, so the claim in
layouts/partials/work-institution.html cannot quietly stop being true.
Requires Pillow and NumPy (already used by scripts/convert_images.py).
"""
from __future__ import annotations

import argparse
import io
import pathlib
import sys

try:
    import numpy as np
    from PIL import Image
except ImportError as exc:  # pragma: no cover - depends on the local environment
    sys.exit(f"marks_check: needs Pillow and NumPy ({exc}). Try: conda run -n hugo python scripts/marks_check.py")

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets" / "images" / "institutions"
BUILT = ROOT / "public" / "images" / "institutions"


def on_white(im: Image.Image) -> "np.ndarray":
    """Composite onto white: these marks are drawn on the paper colour, not on black."""
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return np.asarray(Image.alpha_composite(bg, im.convert("RGBA")).convert("RGB"), dtype=float)


def psnr(a: "np.ndarray", b: "np.ndarray") -> float:
    mse = ((a - b) ** 2).mean()
    return 99.0 if mse == 0 else float(10 * np.log10(255.0**2 / mse))


def laplacian_variance(a: "np.ndarray") -> float:
    g = a.mean(axis=2)
    lap = (
        -4 * g
        + np.roll(g, 1, 0)
        + np.roll(g, -1, 0)
        + np.roll(g, 1, 1)
        + np.roll(g, -1, 1)
    )[1:-1, 1:-1]
    return float(lap.var())


def chroma_rmse(a: "np.ndarray", b: "np.ndarray") -> tuple[float, float]:
    def ycc(x):
        r, g, bl = x[..., 0], x[..., 1], x[..., 2]
        y = 0.299 * r + 0.587 * g + 0.114 * bl
        cb = -0.1687 * r - 0.3313 * g + 0.5 * bl + 128
        cr = 0.5 * r - 0.4187 * g - 0.0813 * bl + 128
        return y, cb, cr

    ya, cba, cra = ycc(a)
    yb, cbb, crb = ycc(b)
    luma = float(np.sqrt(((ya - yb) ** 2).mean()))
    chroma = float(max(np.sqrt(((cba - cbb) ** 2).mean()), np.sqrt(((cra - crb) ** 2).mean())))
    return luma, chroma


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--min-psnr", type=float, default=40.0, help="floor for a shipped mark (default 40 dB)")
    opts = ap.parse_args()

    if not BUILT.is_dir():
        print(f"marks_check: {BUILT.relative_to(ROOT)} does not exist. Build first: npm run build")
        return 2

    sources = sorted(ASSETS.glob("*.png"))
    if not sources:
        print(f"marks_check: no source marks under {ASSETS.relative_to(ROOT)}")
        return 2

    failures = []
    for src_path in sources:
        stem = src_path.stem
        built = sorted(BUILT.glob(f"{stem}_hu_*"))
        if not built:
            print(f"\n{stem}: no built variants found; is any work tagged `institution: {stem}`?")
            continue

        src = Image.open(src_path).convert("RGBA")
        print(f"\n{stem}  source {src.width}x{src.height}, {src_path.stat().st_size / 1024:.0f} KB")
        print(f"  {'variant':<34}{'px':>5}{'KB':>7}{'PSNR':>8}{'sharp':>8}{'luma':>7}{'chroma':>8}")

        for path in built:
            shipped = Image.open(path).convert("RGBA")
            ideal = src.resize(shipped.size, Image.LANCZOS)
            a, b = on_white(ideal), on_white(shipped)
            p = psnr(a, b)
            sharp = laplacian_variance(b) / laplacian_variance(a)
            luma, chroma = chroma_rmse(a, b)
            flag = "" if p >= opts.min_psnr else "   <-- below floor"
            print(
                f"  {path.name:<34}{shipped.width:>5}{path.stat().st_size / 1024:>7.0f}"
                f"{p:>8.1f}{sharp:>8.2f}{luma:>7.2f}{chroma:>8.2f}{flag}"
            )
            if p < opts.min_psnr:
                failures.append((path.name, p))

            # What the site's usual lossy WebP would have done at the same size.
            for quality in (82, 95):
                buf = io.BytesIO()
                ideal.save(buf, format="WEBP", quality=quality)
                alt = Image.open(io.BytesIO(buf.getvalue())).convert("RGBA")
                c = on_white(alt)
                lu, ch = chroma_rmse(a, c)
                print(
                    f"    {'(lossy webp q%d, for comparison)' % quality:<32}{alt.width:>5}"
                    f"{len(buf.getvalue()) / 1024:>7.0f}{psnr(a, c):>8.1f}"
                    f"{laplacian_variance(c) / laplacian_variance(a):>8.2f}{lu:>7.2f}{ch:>8.2f}"
                )

    print(
        "\nPSNR is against an ideal Lanczos downscale of the source; 99 means identical."
        "\nsharp is edge energy relative to that ideal; 1.00 means nothing was smoothed away."
        "\nluma and chroma are RMSE per channel: lossy WebP's chroma error is the visible one."
    )
    if failures:
        print("\nBelow the floor: " + ", ".join(f"{n} ({p:.1f} dB)" for n, p in failures))
        return 1
    print(f"\nEvery shipped mark is at or above {opts.min_psnr:.0f} dB.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
