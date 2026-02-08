#!/bin/bash
# Usage: ./publish.sh <source-dir> <post-slug>
# Example: ./publish.sh ~/projects/psp-compiler/writeup/ psp-ml-compiler
#
# Copies a post directory into the site and pushes.
# The source dir should contain at minimum an index.mdx file.

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <source-dir> <post-slug>"
  echo "  source-dir: directory containing index.mdx and any assets"
  echo "  post-slug:  URL slug for the post (e.g. psp-ml-compiler)"
  exit 1
fi

SRC="$1"
SLUG="$2"
SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$SITE_DIR/src/content/posts/$SLUG"

if [ ! -f "$SRC/index.mdx" ]; then
  echo "Error: $SRC/index.mdx not found"
  echo "Post directory must contain an index.mdx file."
  exit 1
fi

mkdir -p "$DEST"
rsync -av --delete "$SRC/" "$DEST/"

cd "$SITE_DIR"
git add -A
git commit -m "post: $SLUG"
git push

echo ""
echo "Published: $SLUG"
echo "URL will be: https://skhattak.dev/posts/$SLUG/"
