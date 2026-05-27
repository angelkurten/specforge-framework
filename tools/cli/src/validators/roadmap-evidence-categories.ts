// PRD-003 § 7.4: roadmap-evidence-categories.
// Every item in ROADMAP.md cites at least one entry from the six evidence
// categories (or the category-7 retroactive escape). Items with only a
// category-6 hypothesis must have a falsifiable validation plan.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { Finding, Validator } from "./types.js";

export const id = "roadmap-evidence-categories";

const ITEM_RE = /^###\s+ROADMAP-(\d+|T-\d+)/gm;

interface Item {
  id: string;
  startLine: number;
  endLine: number;
  body: string;
}

function splitItems(text: string): Item[] {
  const lines = text.split("\n");
  const starts: Array<{ id: string; line: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^###\s+ROADMAP-([0-9T-]+)/.exec(lines[i]!);
    if (m) starts.push({ id: m[1]!, line: i });
  }
  const items: Item[] = [];
  for (let k = 0; k < starts.length; k++) {
    const start = starts[k]!.line;
    const end = k + 1 < starts.length ? starts[k + 1]!.line : lines.length;
    items.push({
      id: `ROADMAP-${starts[k]!.id}`,
      startLine: start,
      endLine: end,
      body: lines.slice(start, end).join("\n"),
    });
  }
  return items;
}

function extractEvidenceEntries(body: string): string[] {
  // Look for an `Evidence:` field followed by bullet lines, or an inline list.
  const idx = body.search(/^Evidence:/m);
  if (idx === -1) return [];
  const rest = body.slice(idx);
  const lines = rest.split("\n");
  const entries: string[] = [];
  // Skip the `Evidence:` line itself.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^[A-Z][A-Za-z _-]*:/.test(line)) break; // next field
    if (line.trim() === "") {
      // Could be a blank line between bullets; only break if the following
      // line is a new field.
      const next = lines[i + 1] ?? "";
      if (/^[A-Z][A-Za-z _-]*:/.test(next)) break;
      continue;
    }
    const bullet = /^\s*-\s+(.*)$/.exec(line);
    if (bullet) entries.push(bullet[1]!);
  }
  return entries;
}

const URL_RE = /https?:\/\/\S+/;
const TICKET_RE = /\b[A-Z][A-Z0-9]+-\d+\b/;
const HYPOTHESIS_RE = /^hypothesis:/i;
const QUOTE_RE = /['"][^'"]+['"]/;
const METRIC_HINT_RE = /\b(\d+(\.\d+)?\s*(\/|per|%)|metric|board|dashboard|last\s+\d+\s+days?)\b/i;
const RESEARCH_HINT_RE = /\b(usability test|N\s*=\s*\d+|interview|survey)\b/i;
const PRD_REF_RE = /\bPRD-\d{3}\b/;
const VALIDATION_PLAN_RE = /\b(validate|success\s*=|threshold|N\s*[≥>=]\s*\d+)\b/i;

type Category = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function categoriseEntry(entry: string): Category[] {
  const cats: Category[] = [];
  if (HYPOTHESIS_RE.test(entry)) cats.push(6);
  if (URL_RE.test(entry)) cats.push(5);
  if (TICKET_RE.test(entry)) cats.push(2);
  if (METRIC_HINT_RE.test(entry)) cats.push(1);
  if (RESEARCH_HINT_RE.test(entry)) cats.push(3);
  if (QUOTE_RE.test(entry)) cats.push(4);
  if (PRD_REF_RE.test(entry) && /^\s*\[?PRD-/.test(entry)) cats.push(7);
  return cats;
}

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
      const entries = extractEvidenceEntries(item.body);
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
