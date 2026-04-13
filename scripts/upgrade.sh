#!/usr/bin/env bash
set -euo pipefail

# specforge upgrade script
# Updates framework files from either a git remote or a local specforge directory.
# Team data (SIBLINGS.md, PRDs, ADRs) is never overwritten.
#
# Usage:
#   ./scripts/upgrade.sh                         # auto-detect source
#   ./scripts/upgrade.sh --git [remote] [branch]  # from git remote (fork/clone setup)
#   ./scripts/upgrade.sh --local /path/to/specforge # from local directory (copy setup)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION_FILE="$PROJECT_DIR/VERSION"

# --- Framework files: these get updated ---
FRAMEWORK_FILES=(
  "CLAUDE.md"
  "CONVENTIONS.md"
  "README.md"
  "LICENSE"
  "CHANGELOG.md"
  "VERSION"
)

FRAMEWORK_DIRS=(
  ".claude/rules"
  "templates"
  "agents"
  "examples"
  "scripts"
)

# --- Team data: never overwritten ---
TEAM_FILES=(
  "SIBLINGS.md"
)

TEAM_PATTERNS=(
  '[0-9][0-9][0-9]-*.md'
  'ADR-[0-9][0-9][0-9]-*.md'
)

# --- Formatting ---
bold()  { printf '\033[1m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
dim()   { printf '\033[2m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$1"; }

# --- Read current version ---
current_version() {
  if [[ -f "$VERSION_FILE" ]]; then
    cat "$VERSION_FILE" | tr -d '[:space:]'
  else
    echo "unknown"
  fi
}

# --- Check for uncommitted changes ---
preflight_git() {
  cd "$PROJECT_DIR"
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    if ! git diff --quiet || ! git diff --cached --quiet; then
      red "Error: uncommitted changes in $PROJECT_DIR. Commit or stash first."
      git status --short
      exit 1
    fi
  fi
}

# --- Detect mode ---
detect_mode() {
  # If project has a specforge-compatible remote, suggest git mode
  cd "$PROJECT_DIR"
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    if git remote get-url origin &>/dev/null; then
      local url
      url="$(git remote get-url origin 2>/dev/null || true)"
      if [[ "$url" == *"specforge"* ]]; then
        echo "git"
        return
      fi
    fi
  fi
  echo "local"
}

# ============================================================
# MODE: git (fork/clone of specforge)
# ============================================================
upgrade_git() {
  local remote="${1:-origin}"
  local branch="${2:-main}"

  cd "$PROJECT_DIR"

  if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    red "Error: $PROJECT_DIR is not a git repository."
    exit 1
  fi

  if ! git remote get-url "$remote" &>/dev/null; then
    red "Error: remote '$remote' not found."
    echo "Usage: $0 --git [remote] [branch]"
    exit 1
  fi

  local current
  current="$(current_version)"
  bold "specforge upgrade (git mode)"
  echo "Current version: $current"
  echo "Remote:          $remote/$branch"
  echo ""

  echo "Fetching from $remote..."
  git fetch "$remote" "$branch" --tags --quiet

  local local_head remote_head
  local_head="$(git rev-parse HEAD)"
  remote_head="$(git rev-parse "$remote/$branch")"

  if [[ "$local_head" == "$remote_head" ]]; then
    green "Already up to date (v$current)."
    exit 0
  fi

  # Show changelog diff
  bold "Changes since v$current:"
  echo ""
  if git show "$remote/$branch:CHANGELOG.md" &>/dev/null; then
    local changelog_diff
    changelog_diff="$(git diff "$local_head".."$remote_head" -- CHANGELOG.md 2>/dev/null || true)"
    if [[ -n "$changelog_diff" ]]; then
      echo "$changelog_diff" | grep '^+' | grep -v '^+++' | sed 's/^+/  /' || true
      echo ""
    fi
  fi

  # Show changed files
  bold "Framework files changed:"
  local changed_files
  changed_files="$(git diff --name-only "$local_head".."$remote_head")"
  while IFS= read -r file; do
    if is_team_file "$file"; then
      dim "  [skip] $file  (team data)"
    else
      echo "  $file"
    fi
  done <<< "$changed_files"
  echo ""

  # Read new version
  local new_version="$current"
  if git show "$remote/$branch:VERSION" &>/dev/null; then
    new_version="$(git show "$remote/$branch:VERSION" | tr -d '[:space:]')"
  fi

  read -rp "Upgrade from v$current to v$new_version? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi

  echo ""
  echo "Merging $remote/$branch..."
  if git merge "$remote/$branch" --no-edit; then
    echo ""
    green "Upgraded to v$new_version."
    echo ""
    echo "Team data (SIBLINGS.md, PRDs, ADRs) untouched."
    echo "If you see merge conflicts, resolve team data in favor of YOUR version."
  else
    echo ""
    red "Merge conflict detected."
    echo "Resolve conflicts, then: git merge --continue"
    echo "Team data → keep yours. Framework files → keep remote."
    exit 1
  fi
}

# ============================================================
# MODE: local (copy from a specforge directory)
# ============================================================
upgrade_local() {
  local source_dir="$1"

  if [[ ! -d "$source_dir" ]]; then
    red "Error: source directory '$source_dir' not found."
    exit 1
  fi

  if [[ ! -f "$source_dir/VERSION" ]]; then
    red "Error: '$source_dir' does not look like a specforge directory (no VERSION file)."
    exit 1
  fi

  local current new_version
  current="$(current_version)"
  new_version="$(cat "$source_dir/VERSION" | tr -d '[:space:]')"

  bold "specforge upgrade (local mode)"
  echo "Current version: v$current"
  echo "Source:          $source_dir (v$new_version)"
  echo "Target:          $PROJECT_DIR"
  echo ""

  if [[ "$current" == "$new_version" ]]; then
    green "Already up to date (v$current)."
    echo ""
    read -rp "Force re-copy anyway? [y/N] " force
    if [[ ! "$force" =~ ^[Yy]$ ]]; then
      exit 0
    fi
  fi

  # Show what will change
  bold "Files to update:"
  local has_changes=false

  for file in "${FRAMEWORK_FILES[@]}"; do
    if [[ -f "$source_dir/$file" ]]; then
      if [[ -f "$PROJECT_DIR/$file" ]]; then
        if ! diff -q "$source_dir/$file" "$PROJECT_DIR/$file" &>/dev/null; then
          echo "  [update] $file"
          has_changes=true
        else
          dim "  [unchanged] $file"
        fi
      else
        echo "  [new] $file"
        has_changes=true
      fi
    fi
  done

  for dir in "${FRAMEWORK_DIRS[@]}"; do
    if [[ -d "$source_dir/$dir" ]]; then
      for file in "$source_dir/$dir"/*; do
        [[ -f "$file" ]] || continue
        local rel="${dir}/$(basename "$file")"
        if [[ -f "$PROJECT_DIR/$rel" ]]; then
          if ! diff -q "$file" "$PROJECT_DIR/$rel" &>/dev/null; then
            echo "  [update] $rel"
            has_changes=true
          else
            dim "  [unchanged] $rel"
          fi
        else
          echo "  [new] $rel"
          has_changes=true
        fi
      done
    fi
  done

  echo ""
  bold "Team data (never touched):"
  for file in "${TEAM_FILES[@]}"; do
    if [[ -f "$PROJECT_DIR/$file" ]]; then
      dim "  [skip] $file"
    fi
  done
  local prd_count
  prd_count="$(find "$PROJECT_DIR" -maxdepth 1 -name '[0-9][0-9][0-9]-*.md' -o -name 'ADR-[0-9][0-9][0-9]-*.md' 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$prd_count" -gt 0 ]]; then
    dim "  [skip] $prd_count PRDs/ADRs"
  fi
  echo ""

  if ! $has_changes; then
    green "No framework files need updating."
    exit 0
  fi

  # Check for local customizations
  local customized=()
  if [[ -f "$PROJECT_DIR/CLAUDE.md" && -f "$source_dir/CLAUDE.md" ]]; then
    if ! diff -q "$source_dir/CLAUDE.md" "$PROJECT_DIR/CLAUDE.md" &>/dev/null; then
      customized+=("CLAUDE.md")
    fi
  fi

  if [[ ${#customized[@]} -gt 0 ]]; then
    yellow "Warning: these files have local customizations:"
    for f in "${customized[@]}"; do
      yellow "  $f"
    done
    echo ""
    echo "Options:"
    echo "  [o] Overwrite with specforge version (lose customizations)"
    echo "  [s] Skip these files (keep yours)"
    echo "  [b] Backup to .bak then overwrite"
    read -rp "Choice [o/s/b]: " custom_choice
    echo ""
  fi

  read -rp "Upgrade from v$current to v$new_version? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi

  # --- Copy framework files ---
  echo ""
  echo "Copying framework files..."

  for file in "${FRAMEWORK_FILES[@]}"; do
    [[ -f "$source_dir/$file" ]] || continue

    # Handle customized files
    local skip=false
    for cf in "${customized[@]+"${customized[@]}"}"; do
      if [[ "$file" == "$cf" ]]; then
        case "${custom_choice:-o}" in
          s|S) dim "  [skip] $file (customized)"; skip=true ;;
          b|B) cp "$PROJECT_DIR/$file" "$PROJECT_DIR/${file}.bak"
               echo "  [backup] $file → ${file}.bak" ;;
        esac
        break
      fi
    done

    if ! $skip; then
      cp "$source_dir/$file" "$PROJECT_DIR/$file"
      echo "  [copied] $file"
    fi
  done

  for dir in "${FRAMEWORK_DIRS[@]}"; do
    [[ -d "$source_dir/$dir" ]] || continue
    mkdir -p "$PROJECT_DIR/$dir"
    for file in "$source_dir/$dir"/*; do
      [[ -f "$file" ]] || continue
      local rel="${dir}/$(basename "$file")"
      cp "$file" "$PROJECT_DIR/$rel"
      echo "  [copied] $rel"
    done
  done

  echo ""
  green "Upgraded to v$new_version."
  echo ""
  echo "Team data (SIBLINGS.md, PRDs, ADRs) untouched."
  echo "Review changes with: git diff"
  echo "Then commit:         git add -A && git commit -m 'chore: upgrade specforge to v$new_version'"
}

# --- Helper: check if file is team data ---
is_team_file() {
  local file="$1"
  for tf in "${TEAM_FILES[@]}"; do
    [[ "$file" == "$tf" ]] && return 0
  done
  local basename
  basename="$(basename "$file")"
  for pattern in "${TEAM_PATTERNS[@]}"; do
    # shellcheck disable=SC2254
    case "$basename" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

# ============================================================
# MAIN
# ============================================================
preflight_git

case "${1:-}" in
  --git)
    shift
    upgrade_git "${1:-origin}" "${2:-main}"
    ;;
  --local)
    shift
    if [[ -z "${1:-}" ]]; then
      red "Error: --local requires a path argument."
      echo "Usage: $0 --local /path/to/specforge"
      exit 1
    fi
    upgrade_local "$1"
    ;;
  --help|-h)
    echo "Usage:"
    echo "  $0                           Auto-detect upgrade source"
    echo "  $0 --git [remote] [branch]   From git remote (fork/clone)"
    echo "  $0 --local /path/to/specforge From local specforge directory"
    exit 0
    ;;
  *)
    # Auto-detect
    mode="$(detect_mode)"
    if [[ "$mode" == "git" ]]; then
      bold "Detected: git remote contains 'specforge' → using git mode"
      echo ""
      upgrade_git "${1:-origin}" "${2:-main}"
    else
      echo "No specforge git remote detected."
      read -rp "Path to specforge directory: " source_path
      if [[ -z "$source_path" ]]; then
        red "No path provided. Aborted."
        exit 1
      fi
      upgrade_local "$source_path"
    fi
    ;;
esac
