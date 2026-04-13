#!/usr/bin/env bash
set -euo pipefail

# specforge upgrade script
# Pulls the latest framework version while protecting team data files.

SPECFORGE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="$SPECFORGE_DIR/VERSION"
REMOTE="${1:-origin}"
BRANCH="${2:-main}"

# --- Team data files: never overwritten by upgrade ---
TEAM_FILES=(
  "SIBLINGS.md"
)

# Team data patterns: PRDs (NNN-*.md) and ADRs (ADR-*.md) at root
TEAM_PATTERNS=(
  '[0-9][0-9][0-9]-*.md'
  'ADR-[0-9][0-9][0-9]-*.md'
)

bold()  { printf '\033[1m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
dim()   { printf '\033[2m%s\033[0m\n' "$1"; }

cd "$SPECFORGE_DIR"

# --- Preflight checks ---
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  red "Error: $SPECFORGE_DIR is not a git repository."
  exit 1
fi

if ! git remote get-url "$REMOTE" &>/dev/null; then
  red "Error: remote '$REMOTE' not found. Usage: $0 [remote] [branch]"
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  red "Error: you have uncommitted changes. Commit or stash them first."
  echo ""
  git status --short
  exit 1
fi

# --- Read current version ---
CURRENT_VERSION="unknown"
if [[ -f "$VERSION_FILE" ]]; then
  CURRENT_VERSION="$(cat "$VERSION_FILE" | tr -d '[:space:]')"
fi
bold "specforge upgrade"
echo "Current version: $CURRENT_VERSION"
echo "Remote:          $REMOTE/$BRANCH"
echo ""

# --- Fetch ---
echo "Fetching from $REMOTE..."
git fetch "$REMOTE" "$BRANCH" --tags --quiet

# --- Check if already up to date ---
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "$REMOTE/$BRANCH")"

if [[ "$LOCAL_HEAD" == "$REMOTE_HEAD" ]]; then
  green "Already up to date (v$CURRENT_VERSION)."
  exit 0
fi

# --- Show what changed ---
bold "Changes since v$CURRENT_VERSION:"
echo ""

# Show changelog diff if it exists on remote
if git show "$REMOTE/$BRANCH:CHANGELOG.md" &>/dev/null; then
  CHANGELOG_DIFF="$(git diff "$LOCAL_HEAD".."$REMOTE_HEAD" -- CHANGELOG.md 2>/dev/null || true)"
  if [[ -n "$CHANGELOG_DIFF" ]]; then
    echo "$CHANGELOG_DIFF" | grep '^+' | grep -v '^+++' | sed 's/^+/  /' || true
    echo ""
  fi
fi

# Show framework files that changed (exclude team data)
bold "Framework files changed:"
CHANGED_FILES="$(git diff --name-only "$LOCAL_HEAD".."$REMOTE_HEAD")"
while IFS= read -r file; do
  is_team=false

  # Check explicit team files
  for tf in "${TEAM_FILES[@]}"; do
    [[ "$file" == "$tf" ]] && is_team=true && break
  done

  # Check team patterns (PRDs and ADRs)
  if ! $is_team; then
    for pattern in "${TEAM_PATTERNS[@]}"; do
      basename="$(basename "$file")"
      # shellcheck disable=SC2254
      case "$basename" in
        $pattern) is_team=true; break ;;
      esac
    done
  fi

  if $is_team; then
    dim "  [skip] $file  (team data)"
  else
    echo "  $file"
  fi
done <<< "$CHANGED_FILES"
echo ""

# --- Read new version from remote ---
NEW_VERSION="$CURRENT_VERSION"
if git show "$REMOTE/$BRANCH:VERSION" &>/dev/null; then
  NEW_VERSION="$(git show "$REMOTE/$BRANCH:VERSION" | tr -d '[:space:]')"
fi

# --- Confirm ---
read -rp "Upgrade from v$CURRENT_VERSION to v$NEW_VERSION? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# --- Merge ---
echo ""
echo "Merging $REMOTE/$BRANCH..."
if git merge "$REMOTE/$BRANCH" --no-edit; then
  echo ""
  green "Upgraded to v$NEW_VERSION."
  echo ""
  echo "Team data files are untouched (they only change when you edit them)."
  echo "If you see merge conflicts in SIBLINGS.md or your PRDs, resolve them"
  echo "in favor of your local version — framework upgrades never modify team data."
else
  echo ""
  red "Merge conflict detected."
  echo ""
  echo "This is expected if you modified framework files (templates, rules, etc.)."
  echo "Resolve conflicts, then run:  git merge --continue"
  echo ""
  echo "Team data files (SIBLINGS.md, PRDs, ADRs) should keep YOUR version."
  echo "Framework files should generally take the REMOTE version."
  exit 1
fi
