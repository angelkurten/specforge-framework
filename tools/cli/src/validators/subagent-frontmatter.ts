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
 * Containment is case-insensitive. APFS resolves paths case-insensitively, so
 * a `.claude/agents/SpecForge/` tree into which `init` wrote the definitions
 * must count as inside the namespace — a case-sensitive test would fire class
 * 2 twelve times on a correct install, and errors change `doctor`'s exit code.
 * On a case-sensitive filesystem the same rule makes every case-variant of the
 * namespace itself reserved, which is one coherent posture on both families.
 */
function insideNamespace(rel: string): boolean {
  return rel.toLowerCase().startsWith(NAMESPACE);
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

    // Scope is the project tree, and that limit is structural: the validator
    // receives `cwd` and its walk is rooted there, so a shadow at user-scope
    // `~/.claude/agents/` is unreachable by any repo-scoped control (§ 8).
    async function walk(rel: string): Promise<void> {
      let entries;
      try {
        entries = await fs.readdir(path.join(cwd, rel), { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of [...entries].sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const childRel = `${rel}/${e.name}`;
        const abs = path.join(cwd, childRel);

        if (e.isSymbolicLink()) {
          // Symlinks are findings, not skips — every other walk in this
          // codebase branches on isFile()/isDirectory() and silently drops
          // symlink dirents, so a shadow planted as a symlink would be
          // invisible here while Claude Code reads it normally.
          const inside = insideNamespace(childRel);
          let target: string;
          try {
            target = await fs.readlink(abs);
          } catch {
            target = "<unreadable>";
          }
          findings.push({
            rule: id,
            severity: inside ? "error" : "warning",
            file: childRel,
            message: `symlinked entry under \`${AGENTS_DIR}/\` → \`${target}\` (resolved and checked, not skipped)`,
          });
          // And then resolve it: a terminal symlink finding alone would
          // re-open the evasion one severity notch down, since a warning
          // outside the namespace does not change `doctor`'s exit code.
          // Resolving may read a target outside cwd; that is acceptable for a
          // read-only validator, and the finding above reports the target.
          if (!e.name.endsWith(".md")) continue;
          let text: string;
          try {
            const st = await fs.stat(abs);
            // A link to a directory gets the finding above but is not
            // traversed — resolving into it risks a cycle, and the class
            // checks operate on frontmatter.
            if (!st.isFile()) continue;
            text = await fs.readFile(abs, "utf8");
          } catch {
            continue; // broken link — the finding above is the record
          }
          findings.push(...checkContents(childRel, inside, text));
          continue;
        }

        if (e.isDirectory()) {
          await walk(childRel);
          continue;
        }
        if (!e.isFile() || !e.name.endsWith(".md")) continue;

        const inside = insideNamespace(childRel);
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
