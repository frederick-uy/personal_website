#!/usr/bin/env bash
# One-time: replace `main` with a 1:1 copy of the WordPress site (photos shrunk).
# Usage (in a Codespace):  bash tools/run_migration.sh "<share_dl_base_url>"
set -euo pipefail
SHARE_URL="$1"
REPO_DIR="$(git rev-parse --show-toplevel)"
cd "$REPO_DIR"

echo "==> Installing Pillow (image library)"
pip install -q --disable-pip-version-check pillow

echo "==> Saving migration script outside the repo"
cp tools/migrate_wordpress.py /tmp/migrate_wordpress.py

echo "==> Switching to main"
git fetch -q origin main
git checkout -q main
git reset -q --hard origin/main

echo "==> Downloading and shrinking files"
mkdir -p /tmp/site  # keep earlier downloads so a rerun resumes
python3 /tmp/migrate_wordpress.py "$SHARE_URL" /tmp/site
find /tmp/site -name "*.part" -delete

echo "==> Replacing main's files with the WordPress copy"
git rm -rq --ignore-unmatch .
cp -a /tmp/site/. .
mkdir -p tools && cp /tmp/migrate_wordpress.py tools/
cat > README.md <<'EOF'
# personal_website
Personal Website - www.frederickuy.com

This branch (`main`) is a 1:1 static copy of the original WordPress site,
exported with Simply Static, with photos resized for the web.
Hosted on Cloudflare Pages; every push to `main` deploys automatically.

The redesign lives on the `redesign` branch.
EOF
printf '.DS_Store\n__pycache__/\n' > .gitignore

echo "==> Committing"
git add -A
git commit -q -m "Migrate WordPress site 1:1 (static export, web-sized photos)

Exported with Simply Static; author/feed pages excluded (spam accounts).
Photos over 400 KB resized to max 2000px, same file names and paths."
echo "==> Pushing to GitHub"
git push origin main
echo "==> ALL DONE"
git log --oneline -1
du -sh --exclude=.git . 2>/dev/null || true
