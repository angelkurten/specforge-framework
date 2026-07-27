// PRD-003 § 7.4: roadmap-evidence-categories.
// Every item in ROADMAP.md cites at least one entry from the six evidence
// categories (or the category-7 retroactive escape). Items with only a
// category-6 hypothesis must have a falsifiable validation plan.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  categoriseEntry,
  extractEvidenceEntries,
  splitItems,
} from "./roadmap-parse.js";
import type { Finding, Validator } from "./types.js";

export const id = "roadmap-evidence-categories";

const VALIDATION_PLAN_RE = /\b(validate|success\s*=|threshold|N\s*[≥>=]\s*\d+)\b/i;

export const validator: Validator = {
  id,
  async run(cwd: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    let text: string;
    try {
      text = await fs.readFile(path.join(cwd, "ROADMAP.md"), "utf8");
    } catch {
      return findings;
    }

    const items = splitItems(text);
    for (const item of items) {
      // Theme blocks (ROADMAP-T-NNN) don't need evidence themselves.
      if (item.id.startsWith("ROADMAP-T-")) continue;
      const entries = extractEvidenceEntries(item).map((e) => e.text);
      if (entries.length === 0) {
        findings.push({
          rule: id,
          severity: "error",
          file: "ROADMAP.md",
          line: item.startLine + 1,
          message: `${item.id} cites zero evidence entries`,
        });
        continue;
      }
      let nonHypothesis = 0;
      let hasHypothesis = false;
      let hypothesisHasPlan = false;
      for (const entry of entries) {
        const cats = categoriseEntry(entry);
        if (cats.length === 0) continue;
        if (cats.includes(6)) {
          hasHypothesis = true;
          if (VALIDATION_PLAN_RE.test(entry)) hypothesisHasPlan = true;
        }
        for (const c of cats) {
          if (c !== 6) nonHypothesis += 1;
        }
      }
      if (nonHypothesis === 0 && hasHypothesis && !hypothesisHasPlan) {
        findings.push({
          rule: id,
          severity: "error",
          file: "ROADMAP.md",
          line: item.startLine + 1,
          message: `${item.id} has only a hypothesis without a falsifiable validation plan`,
        });
      }
      if (nonHypothesis === 0 && !hasHypothesis) {
        findings.push({
          rule: id,
          severity: "error",
          file: "ROADMAP.md",
          line: item.startLine + 1,
          message: `${item.id} cites no recognised evidence category`,
        });
      }
    }
    return findings;
  },
};

export const run = validator.run;
