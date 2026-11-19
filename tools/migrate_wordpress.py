#!/usr/bin/env python3
"""
One-time 1:1 migration of the WordPress site (Simply Static export) into this repo.

Downloads every file listed in the export's _manifest.txt from a temporary
File Browser share link, shrinks large photos to web size (same file names,
so the HTML needs no changes), and writes everything into OUT_DIR.

Usage:
  python3 tools/migrate_wordpress.py <share_base_url> <out_dir>
  e.g. python3 tools/migrate_wordpress.py "https://host/prefix/api/public/dl/HASH" /tmp/site
"""
import concurrent.futures as cf
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageOps

MAX_SIDE = 2000          # px, longest side for photos
JPEG_QUALITY = 82
SHRINK_OVER = 400_000    # only touch images bigger than this (bytes)
HARD_LIMIT = 25 * 1024 * 1024  # Cloudflare Pages per-file limit
WORKERS = 3              # Hostinger throttles parallel downloads
PAUSE = 0.15             # seconds between requests per worker

BASE, OUT = sys.argv[1].rstrip("/"), sys.argv[2]


def url_for(path: str) -> str:
    return BASE + "/" + urllib.parse.quote(path)


def fetch(path: str, tries: int = 40) -> bytes:
    """Download politely: Hostinger rate-limits (HTTP 429), so back off and retry."""
    wait = 15
    for i in range(tries):
        try:
            req = urllib.request.Request(url_for(path), headers={"User-Agent": "curl/8 (site-migration)"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            time.sleep(PAUSE)
            return data
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 508) and i < tries - 1:
                ra = e.headers.get("Retry-After")
                delay = int(ra) if ra and ra.isdigit() else wait
                print(f"  rate-limited ({e.code}), waiting {delay}s", flush=True)
                time.sleep(delay)
                wait = min(wait * 2, 300)
                continue
            raise RuntimeError(f"{path}: HTTP {e.code}")
        except Exception as e:
            if i >= 5:
                raise RuntimeError(f"{path}: {e}")
            time.sleep(5 * (i + 1))


def shrink(dest: str) -> None:
    low = dest.lower()
    if not low.endswith((".jpg", ".jpeg", ".png", ".webp")):
        return
    if os.path.getsize(dest) <= SHRINK_OVER:
        return
    with Image.open(dest) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        if low.endswith((".jpg", ".jpeg")):
            im.convert("RGB").save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        elif low.endswith(".png"):
            im.save(dest, "PNG", optimize=True)
        else:
            im.save(dest, "WEBP", quality=JPEG_QUALITY, method=6)


def work(path: str):
    dest = os.path.join(OUT, path)
    if os.path.exists(dest):  # resume: already downloaded (and shrunk) in an earlier run
        size = os.path.getsize(dest)
        return path, size, size, "ok"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    data = fetch(path)
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    before = len(data)
    try:
        os.replace(tmp, dest)
        shrink(dest)
    except Exception as e:
        print(f"  ! could not shrink {path}: {e}")
    after = os.path.getsize(dest)
    if after > HARD_LIMIT:
        os.remove(dest)
        return path, before, 0, "too-big"
    return path, before, after, "ok"


def main() -> None:
    manifest = fetch("_manifest.txt").decode().split("\n")
    manifest = [p for p in manifest if p and p != "_manifest.txt"]
    print(f"{len(manifest)} files to copy", flush=True)
    tot_in = tot_out = 0
    skipped, failed = [], []
    with cf.ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = {ex.submit(work, p): p for p in manifest}
        for n, fut in enumerate(cf.as_completed(futs), 1):
            try:
                path, b, a, status = fut.result()
                tot_in += b
                tot_out += a
                if status == "too-big":
                    skipped.append(path)
            except Exception as e:
                failed.append(str(e))
            if n % 250 == 0 or n == len(manifest):
                print(f"  {n}/{len(manifest)}  downloaded {tot_in/1e6:.0f} MB -> kept {tot_out/1e6:.0f} MB", flush=True)
    print(f"\nDone: {tot_in/1e6:.0f} MB -> {tot_out/1e6:.0f} MB")
    if skipped:
        print("Skipped (over 25 MB even after shrinking):", *skipped, sep="\n  ")
    if failed:
        print(f"FAILED {len(failed)}:", *failed[:20], sep="\n  ")
        sys.exit(1)


if __name__ == "__main__":
    main()
