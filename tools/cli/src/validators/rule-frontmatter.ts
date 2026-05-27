// PRD-003 § 7.4: rule-frontmatter.
// Every .claude/rules/*.md has YAML frontmatter with `name` and
// `description`. Path-scoped rules also declare `paths:` as a list.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { parseYaml } from "../yaml.js";
import type { Finding, Validator } from "./types.js";

export const id = "rule-frontmatter";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;

// Names of path-scoped rules per CLAUDE.md / framework-maintenance.md.
const KNOWN_PATH_SCOPED = new Set(["adr-specific", "framework-maintenance"]);

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const rulesDir = path.join(cwd, ".claude", "rules");
    let entries;
    try {
      entries = await fs.readdir(rulesDir, { withFileTypes: true });
    } catch {
      return findings;
    }

    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".md")) continue;
      const rel = path.join(".claude", "rules", e.name);
      const text = await fs.readFile(path.join(rulesDir, e.name), "utf8");
      const m = FRONTMATTER_RE.exec(text);
      if (!m) {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: "missing YAML frontmatter block",
        });
        continue;
      }
      let fm: any;
      try {
        fm = parseYaml(m[1]!);
      } catch (err) {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: `frontmatter YAML invalid: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
      if (fm === null || typeof fm !== "object") {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: "frontmatter is not a mapping",
        });
        continue;
      }
      if (typeof fm.name !== "string" || fm.name.trim() === "") {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: "frontmatter missing `name`",
        });
      }
      if (typeof fm.description !== "string" || fm.description.trim() === "") {
        findings.push({
          rule: id,
          severity: "error",
          file: rel,
          message: "frontmatter missing `description`",
        });
      }
      const stem = e.name.replace(/\.md$/, "");
      if (KNOWN_PATH_SCOPED.has(stem)) {
        if (!Array.isArray(fm.paths)) {
          findings.push({
            rule: id,
            severity: "error",
            file: rel,
            message: "path-scoped rule must declare `paths:` as a YAML list",
          });
        }
      }
    }
    return findings;
  },
};

export const run = validator.run;
