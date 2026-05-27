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
  "CHANGELOG.md",
  "VERSION",
  ".claude/rules/**",
  "templates/**",
  "agents/**",
  "examples/**",
  "scripts/upgrade.sh",
  "mkdocs.yml",
  "requirements-docs.txt",
  "docs/**",
  ".github/workflows/cli-release.yml",
  ".github/workflows/specforge-ci.yml",
];

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

  // Framework takes precedence over team data because the reserved workflow
  // filenames are listed in FRAMEWORK_FILES but the team-data table includes
  // a generic `.github/workflows/*` catch-all.
  if (matchesAny(relPath, FRAMEWORK_FILES)) return "framework";

  // For team-data root-only patterns (PRDs/ADRs/AgDRs), reject nested paths.
  // The patterns themselves don't contain `/`, so the regex already rejects
  // nested paths — no extra logic needed.
  if (matchesAny(relPath, TEAM_DATA_PATTERNS)) return "team";

  return "unknown";
}
