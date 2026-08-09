// PRD-006 § 5.4: subagent-frontmatter.
//
// Walks `.claude/agents/**` under the install cwd — recursively, matching the
// partition pattern's own recursion rather than `rule-frontmatter`'s
// one-level read — and reports two error classes:
//
//   1. Schema, inside the namespace: a file under `.claude/agents/specforge/`
//      (any depth) that lacks parseable frontmatter, lacks `name` or
//      `description`, declares a `name` without the `specforge-` prefix, or a
//      `model` outside the accepted alias set.
//   2. Reserved prefix, outside the namespace: any other file under
//      `.claude/agents/` whose frontmatter `name` starts with `specforge-`.
//      Identity is the `name` field and Claude Code's scan is recursive, so
//      such a file registers under a framework reviewer's identity with an
//      arbitrary body and tool set. The validator, not the prefix convention
//      and not the host's duplicate-name resolution, is the control.
//
// Three walk/comparison semantics are pinned because the naive implementation
// fails open — see the comments at each site.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { parseYaml } from "../yaml.js";
import type { Finding, Validator } from "./types.js";

export const id = "subagent-frontmatter";

const AGENTS_DIR = ".claude/agents";
const NAMESPACE = ".claude/agents/specforge/";
const RESERVED_PREFIX = "specforge-";

/** The four aliases plus `inherit`. A concrete model ID is rejected: pinned
 *  IDs rot when models retire, and the per-dispatch `model` parameter already
 *  covers deliberate pinning (PRD-006 § 5.4). */
const ACCEPTED_MODELS = new Set(["sonnet", "opus", "haiku", "fable", "inherit"]);

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;

/**
 * Identity-based namespace containment. A definition file is inside the
 * namespace iff its canonical on-disk location (`candidateReal`, a realpath) IS
 * the canonical namespace directory (`canonicalReal`, also a realpath) or lives
 * under it. This closes a case-sensitive-filesystem hole that a pure string
 * test leaves open: on Linux CI a DISTINCT directory `.claude/agents/SpecForge/`
 * is a different inode, so its realpath differs from the namespace's and its
 * forged `specforge-`named definitions fall to the class-2 shadowing check
 * instead of passing class 1 silently. On case-insensitive APFS the same
 * directory resolves to the one canonical inode, so a case-variant install
 * stays inside (§ 9 row 25: zero findings). `partition.classify` cannot make
 * this distinction — it is a pure string function with no filesystem access —
 * which is exactly why the two controls disagreed about `SpecForge/` and the
 * gap between them was the hiding place.
 */
export function realpathInside(canonicalReal: string, candidateReal: string): boolean {
  if (candidateReal === canonicalReal) return true;
  const rel = path.relative(canonicalReal, candidateReal);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * The string fallback, used in two places:
 *   1. When the canonical namespace directory does not exist on disk (a fresh
 *      repo, or a shadow planted with no real namespace at all) there is no
 *      realpath to compare against, so the regular-file branch falls back here.
 *   2. Symlink ENTRIES are classified by where the LINK sits, not where it
 *      resolves. A symlink that merely aliases the real namespace under another
 *      name (`.claude/agents/aaa-mirror → ./specforge`) is a warning by its own
 *      location; a symlink planted AS the namespace root is an error via the
 *      root-equality clause below.
 * Case-insensitive because APFS resolves paths case-insensitively, so a
 * `.claude/agents/SpecForge/` link counts the same as the canonical spelling.
 */
function insideNamespaceString(rel: string): boolean {
  const lower = rel.toLowerCase();
  // The namespace ROOT itself (no trailing slash) counts as inside. Without the
  // equality check, a `startsWith(NAMESPACE)` test with the trailing slash
  // returns false for `.claude/agents/specforge` exactly, so a symlink planted
  // AS the root takes the *outside* branch (a warning, which does not change
  // `doctor`'s exit code) while traversal into its target reaches children that
  // DO carry the trailing slash and pass class 1 cleanly under forged framework
  // names — the exit code never moves. Treating the root as inside makes a
  // symlinked root produce the class-2/inside ERROR and moves the exit code.
  return lower === NAMESPACE.slice(0, -1) || lower.startsWith(NAMESPACE);
}

/** The `name`-prefix comparison is case-insensitive for the same reason:
 *  `SpecForge-security-reviewer` must not slip past when the host's name
 *  resolution is undocumented. */
function usesReservedPrefix(name: string): boolean {
  return name.trim().toLowerCase().startsWith(RESERVED_PREFIX);
}

function err(file: string, message: string): Finding {
  return { rule: id, severity: "error", file, message };
}

/**
 * Apply both error classes to one file's contents. `rel` is the path reported
 * in the finding (for a symlink, the link's own path — that is where the
 * adopter has to go to fix it); `inside` is computed from that same path.
 */
function checkContents(rel: string, inside: boolean, text: string): Finding[] {
  const m = FRONTMATTER_RE.exec(text);
  if (!m) {
    // Outside the namespace a file without frontmatter declares no `name` and
    // so cannot shadow anything; inside it, it is a broken definition.
    return inside ? [err(rel, "missing YAML frontmatter block")] : [];
  }

  let fm: unknown;
  try {
    fm = parseYaml(m[1]!);
  } catch (e) {
    return inside
      ? [
          err(
            rel,
            `frontmatter YAML invalid: ${e instanceof Error ? e.message : String(e)}`,
          ),
        ]
      : [];
  }
  if (fm === null || typeof fm !== "object" || Array.isArray(fm)) {
    return inside ? [err(rel, "frontmatter is not a mapping")] : [];
  }
  const map = fm as Record<string, unknown>;
  const name = typeof map.name === "string" ? map.name : undefined;

  if (!inside) {
    if (name !== undefined && usesReservedPrefix(name)) {
      return [
        err(
          rel,
          `frontmatter \`name: ${name}\` uses the reserved \`${RESERVED_PREFIX}\` prefix outside \`${NAMESPACE}\` — it registers under a framework subagent's identity`,
        ),
      ];
    }
    return [];
  }

  const findings: Finding[] = [];
  if (name === undefined || name.trim() === "") {
    findings.push(err(rel, "frontmatter missing `name`"));
  } else if (!usesReservedPrefix(name)) {
    findings.push(
      err(
        rel,
        `frontmatter \`name: ${name}\` must carry the reserved \`${RESERVED_PREFIX}\` prefix inside \`${NAMESPACE}\``,
      ),
    );
  }
  if (typeof map.description !== "string" || map.description.trim() === "") {
    findings.push(err(rel, "frontmatter missing `description`"));
  }
  if (map.model !== undefined && map.model !== null) {
    const model = typeof map.model === "string" ? map.model.trim() : "";
    if (!ACCEPTED_MODELS.has(model)) {
      findings.push(
        err(
          rel,
          `frontmatter \`model: ${typeof map.model === "string" ? map.model : JSON.stringify(map.model)}\` is outside the accepted set (${[...ACCEPTED_MODELS].join(", ")})`,
        ),
      );
    }
  }
  return findings;
}

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Cycle bound for symlinked-directory traversal: the realpath of every
    // directory we descend into, so a symlink pointing back at an ancestor
    // (or at the namespace root) is entered at most once. Keyed on realpath,
    // not on the link-relative path, because two links can name the same real
    // directory.
    const visited = new Set<string>();

    // Identity-based containment: resolve the canonical namespace directory
    // once, so a definition file's realpath can be compared against it (see
    // `realpathInside`). `null` when the namespace does not exist on disk — a
    // fresh repo or a shadow with no real namespace — in which case the
    // regular-file branch falls back to the string test.
    // The promises `realpath` is load-bearing: on macOS it canonicalizes case
    // to the on-disk spelling, whereas `fs.realpathSync` returns the requested
    // casing. `realpathInside` compares with `path.relative` (a pure string
    // op), so swapping to the sync API would make `canonicalReal` and a walked
    // directory's realpath disagree in case on APFS, flip all twelve
    // definitions to "outside", and reproduce the twelve-false-errors CI break
    // this validator exists to prevent. Keep the promises API here.
    const canonicalReal = await fs
      .realpath(path.join(cwd, NAMESPACE.slice(0, -1)))
      .catch(() => null);

    // Scope is the project tree, and that limit is structural: the validator
    // receives `cwd` and its walk is rooted there, so a shadow at user-scope
    // `~/.claude/agents/` is unreachable by any repo-scoped control (§ 8).
    async function walk(rel: string): Promise<void> {
      let real: string;
      try {
        real = await fs.realpath(path.join(cwd, rel));
      } catch {
        return; // missing or unreadable directory — nothing to walk
      }
      if (visited.has(real)) return; // symlink cycle — already descended here
      visited.add(real);

      let entries;
      try {
        entries = await fs.readdir(path.join(cwd, rel), { withFileTypes: true });
      } catch {
        return;
      }
      // Order non-symlink entries ahead of symlinks at each level so a
      // canonical directory claims its realpath in `visited` before any symlink
      // that mirrors it. Otherwise a mirror sorting alphabetically ahead of the
      // real namespace (e.g. `.claude/agents/aaa-mirror → ./specforge`) would
      // register the namespace's realpath first, short-circuit the real
      // directory when the walk reaches it (dropping its class-1 coverage), and
      // emit spurious class-2 errors against the mirror's children. With the
      // real directory walked first, the mirror hits `visited` and is not
      // re-descended — the run-scoped realpath set (and its cycle bound: a→b→a
      // and self-loops still terminate) is otherwise unchanged. Within each
      // group entries stay name-sorted for deterministic finding order.
      const ordered = [...entries].sort((a, b) => {
        const as = a.isSymbolicLink() ? 1 : 0;
        const bs = b.isSymbolicLink() ? 1 : 0;
        if (as !== bs) return as - bs;
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      });
      for (const e of ordered) {
        const childRel = `${rel}/${e.name}`;
        const abs = path.join(cwd, childRel);

        if (e.isSymbolicLink()) {
          // Symlinks are findings, not skips — every other walk in this
          // codebase branches on isFile()/isDirectory() and silently drops
          // symlink dirents, so a shadow planted as a symlink would be
          // invisible here while Claude Code reads it normally.
          //
          // A symlink is classified by where the LINK sits (string test), not
          // where it resolves: a symlink aliasing the real namespace under
          // another name is a warning by its own location (keeping
          // `aaa-mirror → ./specforge` a warning), while one planted AS the
          // namespace root is an error via the root-equality clause. A shadow
          // hidden behind a symlinked directory is still caught, because we
          // descend and its target's real files hit the realpath test below.
          const inside = insideNamespaceString(childRel);
          let target: string;
          try {
            target = await fs.readlink(abs);
          } catch {
            target = "<unreadable>";
          }

          // Then resolve it: a terminal symlink finding alone would re-open
          // the evasion one severity notch down, since a warning outside the
          // namespace does not change `doctor`'s exit code. A symlinked
          // *directory* is traversed like any other — a shadow planted inside
          // `.claude/agents/team → ../../hidden` would otherwise stay
          // invisible and leave the exit code at 0 — with the realpath
          // `visited` set (above) bounding cycles. Resolving may read a
          // target outside cwd; that is acceptable for a read-only validator,
          // and the finding reports the link target. The finding message is
          // conditional: it only claims "resolved and checked" on the path
          // that actually read and checked the target's frontmatter.
          const isMd = e.name.toLowerCase().endsWith(".md");
          let st;
          try {
            st = await fs.stat(abs);
          } catch {
            st = undefined; // broken link
          }

          let resolution: string;
          let text: string | undefined;
          if (!st) {
            resolution = "broken link, not resolved";
          } else if (st.isDirectory()) {
            resolution = "resolved and traversed, not skipped";
          } else if (!st.isFile()) {
            resolution = "resolved; not a regular file, contents not checked";
          } else if (!isMd) {
            resolution = "resolved; not a `.md` file, contents not checked";
          } else {
            try {
              text = await fs.readFile(abs, "utf8");
              resolution = "resolved and checked, not skipped";
            } catch {
              resolution = "resolved but unreadable, contents not checked";
            }
          }

          findings.push({
            rule: id,
            severity: inside ? "error" : "warning",
            file: childRel,
            message: `symlinked entry under \`${AGENTS_DIR}/\` → \`${target}\` (${resolution})`,
          });

          if (st?.isDirectory()) {
            await walk(childRel);
          } else if (text !== undefined) {
            findings.push(...checkContents(childRel, inside, text));
          }
          continue;
        }

        if (e.isDirectory()) {
          await walk(childRel);
          continue;
        }
        // Case-insensitive `.md` match: `SHADOW.MD` is a real shadow on
        // case-insensitive APFS and must not slip past. The .md-only scope is
        // deliberate; only the case gap is closed here.
        if (!e.isFile() || !e.name.toLowerCase().endsWith(".md")) continue;

        // Identity-based containment (realpath), reusing the parent directory's
        // realpath (`real`) so a regular file needs no extra syscall: its
        // canonical location is `real/<name>`. Falls back to the string test
        // only when the namespace could not be resolved on disk.
        const inside =
          canonicalReal === null
            ? insideNamespaceString(childRel)
            : realpathInside(canonicalReal, path.join(real, e.name));
        let text: string;
        try {
          text = await fs.readFile(abs, "utf8");
        } catch (readErr) {
          if (inside) {
            findings.push(
              err(
                childRel,
                `unreadable: ${readErr instanceof Error ? readErr.message : String(readErr)}`,
              ),
            );
          }
          continue;
        }
        findings.push(...checkContents(childRel, inside, text));
      }
    }

    await walk(AGENTS_DIR);
    return findings;
  },
};

export const run = validator.run;
