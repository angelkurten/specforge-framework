// Partition between framework files (overwriteable) and team data (preserved).
// PRD-003 § 6.2. This file is CLI code (lives in src/), is type-checked at
// compile time, and is the single source of truth that the prepublish script
// imports to populate `tools/cli/framework/`.

/**
 * Framework files: bundled in the npm tarball, overwriteable on `update`,
 * deleted by `--force --erase`. Paths are repo-root-relative POSIX strings.
 *
 * Entries ending with `/**` mean "this directory and everything under it,
 * recursively". Entries without a trailing pattern are individual files.
 */
export const FRAMEWORK_FILES: ReadonlyArray<string> = [
  "CLAUDE.md",
  "CONVENTIONS.md",
  "README.md",
  "README.es.md",
  "LICENSE",
  ".claude/rules/**",
  // Only the namespaced subdirectory is framework-owned (PRD-006 § 6.1).
  // Everything else under `.claude/agents/` is the adopter's: never written
  // by `update`, never collected by `init --force --erase`.
  ".claude/agents/specforge/**",
  "templates/**",
  "examples/**",
  // The pre-panel PRD validator. A single file, not `scripts/**`: the repo's
  // own `scripts/upgrade.sh` is specforge project metadata that PRD-005
  // deliberately stopped installing, and a directory pattern here would drag
  // it back into every adopter's tree.
  "scripts/prd-check.py",
  // v2 (specforge/changes/2026-10-23-specforge-namespace). Everything
  // v2 lives under one `specforge/` folder, so it never claims a project's own
  // `core/`, `scripts/` or `changes/`. The guard and the skills sit under the
  // reserved `specforge` prefix, like `.claude/agents/specforge/`; the skills
  // are listed one by one because prepublish resolves `**` only at the end of
  // a pattern, and a list claims nothing it does not install.
  "specforge/core/**",
  // One by one, not `specforge/scripts/**`: prepublish walks the disk, so a
  // directory pattern would also bundle a local `__pycache__/`.
  "specforge/scripts/lock_tests.py",
  "specforge/scripts/loop.py",
  "specforge/scripts/review_prep.py",
  "specforge/scripts/archive.py",
  "specforge/scripts/compose_check.py",
  ".claude/hooks/specforge_lock_guard.py",
  ".claude/skills/specforge-classify/**",
  ".claude/skills/specforge-loop/**",
  ".claude/skills/specforge-review/**",
  ".claude/skills/specforge-compose/**",
];

/**
 * Files copied into the npm tarball but never written into an adopter's
 * directory by a plain `init`. `prepublish` resolves these alongside
 * FRAMEWORK_FILES; `listBundledFrameworkFiles` excludes them because they do
 * not classify as "framework". Entries must be relative, `..`-free, and must
 * NOT classify as "framework" — see § 9 row 3.
 *
 * PRD-024 retired `optional-rules/headless-session.md` (formerly the sole
 * entry here beside VERSION): the ten spans it owned alone are now in-line
 * clauses in `.claude/rules/workflow.md`, which every `init` already writes.
 */
export const BUNDLE_ONLY_FILES: ReadonlyArray<string> = ["VERSION"];

/**
 * Team-data patterns. Never overwritten by `update`. Deleted by
 * `--force --erase` with the deletion list printed first.
 *
 * Patterns marked `(root only)` only match at the cwd top level.
 */
export const TEAM_DATA_PATTERNS: ReadonlyArray<string> = [
  "SIBLINGS.md",
  "ROADMAP.md",
  "[0-9][0-9][0-9]-*.md",            // PRDs, root only
  "ADR-[0-9][0-9][0-9]-*.md",        // ADRs, root only
  "AgDR-[0-9][0-9][0-9]-*.md",       // AgDRs, root only
  ".specforge/**",
  ".specforge-source",
  ".github/workflows/*",             // team workflows other than the reserved ones
  "specforge/changes/**",            // v2 change folders, archived ones included
  "specforge/DECISIONS.md",          // v2 decision log
];

/**
 * Paths the CLI never reads, writes, or reports.
 */
export const IGNORED_PATTERNS: ReadonlyArray<string> = [
  ".git/**",
  ".gitignore",
  ".gitattributes",
  "node_modules/**",
  "dist/**",
  "build/**",
  ".DS_Store",
  "Thumbs.db",
];

/**
 * Globs (FRAMEWORK_FILES syntax) the framework declares retired: `update`
 * removes them from an adopter's repo when untouched. Empty until v1 is removed.
 */
export const RETIRED_FILES: ReadonlyArray<string> = [];

export function isRetired(rel: string, patterns: ReadonlyArray<string> = RETIRED_FILES): boolean {
  return matchesAny(rel, patterns);
}

/** True when `rel` matches a team-data pattern. */
export function isTeamData(rel: string): boolean {
  return matchesAny(rel, TEAM_DATA_PATTERNS);
}

export type Classification = "framework" | "team" | "ignored" | "unknown";

/**
 * Match a POSIX-style relative path against one of our partition patterns.
 *
 * Pattern grammar (intentionally narrow — only what § 6.2 needs):
 *   - `**`          matches any number of path segments (including zero).
 *   - `*`           matches any sequence of non-`/` characters.
 *   - `[a-z]`       character class (used for `[0-9]` in PRD/ADR/AgDR shapes).
 *   - everything else is a literal.
 */
function patternToRegex(pattern: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // `**` — match any depth, including zero segments. Allow optional
        // trailing slash so `dir/**` matches `dir/x` and `dir/x/y`.
        re += ".*";
        i += 2;
        if (pattern[i] === "/") i += 1;
      } else {
        re += "[^/]*";
        i += 1;
      }
    } else if (c === "[") {
      const close = pattern.indexOf("]", i);
      if (close === -1) {
        re += "\\[";
        i += 1;
      } else {
        re += pattern.slice(i, close + 1);
        i = close + 1;
      }
    } else if (c === "." || c === "(" || c === ")" || c === "+" || c === "?" || c === "|" || c === "^" || c === "$" || c === "\\") {
      re += "\\" + c;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  re += "$";
  return new RegExp(re);
}

const COMPILED: Map<string, RegExp> = new Map();
function compile(pattern: string): RegExp {
  let r = COMPILED.get(pattern);
  if (!r) {
    r = patternToRegex(pattern);
    COMPILED.set(pattern, r);
  }
  return r;
}

function matchesAny(path: string, patterns: ReadonlyArray<string>): boolean {
  for (const p of patterns) {
    if (compile(p).test(path)) return true;
  }
  return false;
}

/**
 * Classify a POSIX-style relative path. Inputs MUST be relative and use `/`.
 * Anything else (absolute, contains `..`) is caller error — callers should
 * have normalised first.
 */
export function classify(relPath: string): Classification {
  if (relPath.startsWith("/") || relPath.includes("..")) {
    // Defensive: we never classify outside the cwd.
    return "ignored";
  }
  if (matchesAny(relPath, IGNORED_PATTERNS)) return "ignored";

  // Framework is tested before team data. Since PRD-005 removed the two
  // reserved workflow names from FRAMEWORK_FILES, no path matches both lists,
  // so the ordering decides nothing today. It is kept as the deliberate
  // resolution for any future entry that would double-match.
  if (matchesAny(relPath, FRAMEWORK_FILES)) return "framework";

  // For team-data root-only patterns (PRDs/ADRs/AgDRs), reject nested paths.
  // The patterns themselves don't contain `/`, so the regex already rejects
  // nested paths — no extra logic needed.
  if (matchesAny(relPath, TEAM_DATA_PATTERNS)) return "team";

  return "unknown";
}
