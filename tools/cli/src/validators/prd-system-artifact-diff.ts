// PRD-003 § 7.4: prd-system-artifact-diff.
// Every Implemented PRD lists `system_artifact_diff` entries whose count
// equals the number of impacted siblings that maintain a SYSTEM_ARTIFACT.md
// (per SIBLINGS.md `Read first` column).

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { parseYaml } from "../yaml.js";
import type { Finding, Validator } from "./types.js";

export const id = "prd-system-artifact-diff";

const PRD_FILE_RE = /^(\d{3})-[a-z0-9][a-z0-9-]*\.md$/;
const STATUS_RE = /^\*\*Status\*\*:\s*(\S+)/m;
const GATE_FENCE_RE = /^##\s+Gate:[^\n]*\n+```yaml\n([\s\S]*?)\n```/m;
const IMPACTED_TABLE_RE =
  /##\s+Impacted Projects\s*\n+\|[^\n]*\|[^\n]*\|\s*\n\|[-:\s|]+\|\s*\n((?:\|[^\n]*\|\s*\n?)+)/m;

interface SiblingInfo {
  name: string;
  readFirst: string;
}

async function readSiblings(cwd: string): Promise<SiblingInfo[]> {
  let text: string;
  try {
    text = await fs.readFile(path.join(cwd, "SIBLINGS.md"), "utf8");
  } catch {
    return [];
  }
  const out: SiblingInfo[] = [];
  // Parse markdown tables. We accept any table with a "Name" / "Project"
  // first column and a "Read first" column.
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
      if (cells.every((c) => /^[-:\s]*$/.test(c))) {
        // separator line
        continue;
      }
      const nameIdx = headers.findIndex((h) => h === "name" || h === "project");
      const readFirstIdx = headers.findIndex((h) => h.includes("read first"));
      if (nameIdx === -1 || readFirstIdx === -1) {
        headers = null;
        continue;
      }
      const name = (cells[nameIdx] ?? "").replace(/\*\*/g, "").trim();
      const readFirst = (cells[readFirstIdx] ?? "").trim();
      if (name) out.push({ name, readFirst });
    } else if (line.trim() === "") {
      headers = null;
    }
  }
  return out;
}

function extractImpactedSiblings(text: string): string[] {
  const m = IMPACTED_TABLE_RE.exec(text);
  if (!m) return [];
  const rows = m[1]!.split("\n").filter((r) => r.trim().startsWith("|"));
  const names: string[] = [];
  for (const row of rows) {
    const cells = row.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 1) continue;
    const name = (cells[0] ?? "").replace(/\*\*/g, "").trim();
    if (name) names.push(name);
  }
  return names;
}

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    let entries;
    try {
      entries = await fs.readdir(cwd, { withFileTypes: true });
    } catch {
      return findings;
    }
    const siblings = await readSiblings(cwd);

    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!PRD_FILE_RE.test(e.name)) continue;
      const text = await fs.readFile(path.join(cwd, e.name), "utf8");
      const statusMatch = STATUS_RE.exec(text);
      const status = statusMatch?.[1]?.trim();
      if (status !== "Implemented") continue;

      const gate = GATE_FENCE_RE.exec(text);
      if (!gate) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "Implemented PRD missing YAML gate block",
        });
        continue;
      }
      let parsed: any;
      try {
        parsed = parseYaml(gate[1]!);
      } catch (err) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: `gate block YAML invalid: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
      const diff = parsed?.system_artifact_diff;
      if (!Array.isArray(diff)) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: "system_artifact_diff must be a YAML list",
        });
        continue;
      }

      const impactedNames = extractImpactedSiblings(text);
      let expected = 0;
      for (const name of impactedNames) {
        const sib = siblings.find((s) => s.name === name);
        if (sib && /SYSTEM_ARTIFACT\.md/i.test(sib.readFirst)) {
          expected += 1;
        }
      }

      if (diff.length !== expected) {
        findings.push({
          rule: id,
          severity: "error",
          file: e.name,
          message: `system_artifact_diff has ${diff.length} entries; expected ${expected} (one per impacted sibling that maintains SYSTEM_ARTIFACT.md)`,
        });
      }
    }

    return findings;
  },
};

export const run = validator.run;
