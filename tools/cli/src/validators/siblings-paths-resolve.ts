// PRD-003 § 7.4: siblings-paths-resolve.
// Every active row in SIBLINGS.md has a resolving `Path` (subject to
// --ignore-sibling).

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator, ValidatorOptions } from "./types.js";

export const id = "siblings-paths-resolve";

interface SiblingRow {
  name: string;
  path: string;
  status: string;
}

function parseSiblings(text: string): SiblingRow[] {
  const out: SiblingRow[] = [];
  const lines = text.split("\n");
  let headers: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (headers === null) {
        if (cells.some((c) => /^name$/i.test(c) || /^project$/i.test(c))) {
          headers = cells.map((c) => c.toLowerCase());
        }
        continue;
      }
      if (cells.every((c) => /^[-:\s]*$/.test(c))) continue;
      const nameIdx = headers.findIndex((h) => h === "name" || h === "project");
      const pathIdx = headers.findIndex((h) => h === "path");
      const statusIdx = headers.findIndex((h) => h === "status");
      if (nameIdx === -1 || pathIdx === -1) {
        headers = null;
        continue;
      }
      const name = (cells[nameIdx] ?? "").replace(/[*`]/g, "").trim();
      const p = (cells[pathIdx] ?? "").replace(/[`*]/g, "").trim();
      const status =
        statusIdx >= 0 ? (cells[statusIdx] ?? "").replace(/[*`]/g, "").trim() : "active";
      if (name && p) {
        out.push({ name, path: p, status: status || "active" });
      }
    } else if (line.trim() === "") {
      headers = null;
    }
  }
  return out;
}

export const validator: Validator = {
  id,
  async run(cwd: string, opts: ValidatorOptions = {}): Promise<Finding[]> {
    const findings: Finding[] = [];
    const ignored = new Set(opts.ignoreSiblings ?? []);

    let text: string;
    try {
      text = await fs.readFile(path.join(cwd, "SIBLINGS.md"), "utf8");
    } catch {
      findings.push({
        rule: id,
        severity: "error",
        file: "SIBLINGS.md",
        message: "SIBLINGS.md not found",
      });
      return findings;
    }

    const rows = parseSiblings(text);
    const knownNames = new Set(rows.map((r) => r.name));

    // Excluded names that don't match any active row are themselves failures.
    for (const ig of ignored) {
      if (!knownNames.has(ig)) {
        findings.push({
          rule: id,
          severity: "error",
          file: "SIBLINGS.md",
          message: `--ignore-sibling=${ig} does not match any row in SIBLINGS.md`,
        });
      }
    }

    for (const row of rows) {
      if (!/active/i.test(row.status)) continue;
      if (ignored.has(row.name)) continue;
      const abs = path.resolve(cwd, row.path);
      try {
        await fs.access(abs);
      } catch {
        findings.push({
          rule: id,
          severity: "error",
          file: "SIBLINGS.md",
          message: `path for sibling "${row.name}" does not resolve: ${row.path}`,
        });
      }
    }

    return findings;
  },
};

export const run = validator.run;
