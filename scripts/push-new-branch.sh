#!/bin/bash
# Create a new branch, commit all changes, and push to GitHub.
# Usage: ./scripts/push-new-branch.sh [branch-name]
# Example: ./scripts/push-new-branch.sh feature/reader-fixes

set -e
cd "$(dirname "$0")/.."

BRANCH="${1:-feature/reader-scroll-zoom-selection}"

echo "→ Creating and checking out branch: $BRANCH"
git checkout -b "$BRANCH"

echo "→ Staging all changes..."
git add -A

if git diff --staged --quiet 2>/dev/null; then
  echo "→ No changes to commit (working tree clean). Pushing existing commits..."
else
  echo "→ Committing..."
  git commit -m "Reader: fix scroll, zoom, text selection for all document types

- Use react-native-gesture-handler Pressable (cancelable) for tap-to-toggle
- Remove RN Pressable from scroll content to avoid blocking gestures
- Add GestureHandlerRootView; floating tap-to-show UI button when hidden
- Apply scroll/zoom/selection fixes for PDF, EPUB, DOCX, TXT"
fi

echo "→ Pushing to origin $BRANCH..."
git push -u origin "$BRANCH"

echo ""
echo "✓ Done. Branch $BRANCH is on GitHub."
