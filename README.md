# frederickuy.com

Static site served by Cloudflare from the repo root.

- `_src/pages/*.dc.html` – page templates (edit these, not the generated `index.html` files)
- `content/journal/*.md` – Journal posts (or write them at `/admin`)
- `images/` – photos
- `node _src/build.mjs` – regenerates every page; a GitHub Action runs this automatically on push
