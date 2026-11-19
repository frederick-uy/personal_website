"""
Turn full-size photos into fast, SEO-friendly website images.

What it does
  - Resizes so the longest side is at most 2000px (sharp on any screen)
  - Converts to WebP (usually 200-400 KB instead of 5-25 MB)
  - Removes EXIF metadata, including GPS location, so you don't publish where photos were taken
  - Renames files to lowercase-with-dashes (good for Google Images)

How to use
  1. Install Pillow once:        pip install Pillow
  2. Put your originals in a folder, e.g.  ~/Desktop/originals
     Tip: rename them first to describe the photo, e.g.
     "Tacoma Graduation UW Tacoma Sarah.jpg"
  3. Run:
        python tools/optimize_images.py ~/Desktop/originals images
     The new .webp files land in the site's images/ folder.
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIDE = 2000
QUALITY = 82
EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic"}


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return s or "photo"


def main(src: str, dst: str) -> None:
    src_dir, dst_dir = Path(src).expanduser(), Path(dst).expanduser()
    dst_dir.mkdir(parents=True, exist_ok=True)
    files = [p for p in sorted(src_dir.iterdir()) if p.suffix.lower() in EXTS]
    if not files:
        print(f"No photos found in {src_dir}")
        return
    total_in = total_out = 0
    for p in files:
        try:
            with Image.open(p) as im:
                im = ImageOps.exif_transpose(im)  # keep the correct rotation
                im = im.convert("RGB")
                im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
                out = dst_dir / f"{slugify(p.stem)}.webp"
                im.save(out, "WEBP", quality=QUALITY, method=6)  # saved without EXIF/GPS
        except Exception as e:  # e.g. HEIC without the plugin
            print(f"  skipped {p.name}: {e}")
            continue
        total_in += p.stat().st_size
        total_out += out.stat().st_size
        print(f"  {p.name} -> {out.name}  {im.width}x{im.height}  {out.stat().st_size // 1024} KB")
    print(f"\nDone: {total_in / 1e6:.1f} MB -> {total_out / 1e6:.1f} MB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
