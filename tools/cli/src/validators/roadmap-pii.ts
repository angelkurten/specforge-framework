// roadmap-pii: the syntactic table in `.claude/rules/roadmap.md` §
// "Forbidden evidence (syntactic)".
//
// That rule file declares itself "the canonical detection surface … detection
// does not depend on any single briefing being present or correct" (PRD-001
// § 8.1 layer 1), and hard rule 12 makes PII findings non-waivable. Until this
// validator existed, all eight patterns were honor-system: enforced only by
// whichever briefing happened to be dispatched.
//
// Severity follows § Visibility: `public` (the default when the header is
// absent) treats email and phone as errors; `private` downgrades those two to
// warnings. Every other pattern keeps its declared severity regardless.
// The carve-out is identity-based — a finding here is resolved by
// reformulating or killing the entry, never by refuting it.

import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  categoriseEntry,
  extractEvidenceEntries,
  quotedSpans,
  readInternalDomains,
  readVisibility,
  splitItems,
  type EvidenceEntry,
} from "./roadmap-parse.js";
import type { Finding, Severity, Validator } from "./types.js";

export const id = "roadmap-pii";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const HANDLE_RE = /(?:^|\s)@[A-Za-z0-9_]{2,}/;
const NAME_RE = /[A-Z][a-z]+\s[A-Z][a-z]+/;
const CRED_URL_RE = /[?&](token|sig|key|auth|access_token)=/i;
const IMAGE_MD_RE = /!\[[^\]]*\]\([^)]*\)/;
const URL_HOST_RE = /https?:\/\/([^/\s:?#]+)/gi;

/**
 * Phone-number-shaped digit runs: 7+ digits carrying common separators.
 * ISO dates are stripped first — `2026-03-18` in a category-4 date stamp is
 * eight separator-joined digits and would otherwise fire on every well-formed
 * quote. ponytail: date-shaped is the only exclusion; add more if a real
 * entry trips it.
 */
function looksLikePhone(text: string): boolean {
  const stripped = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
  const runs = stripped.match(/\d[\d\s().+-]{5,}\d/g) ?? [];
  return runs.some((run) => (run.match(/\d/g) ?? []).length >= 7);
}

function hostsIn(text: string): string[] {
  const hosts: string[] = [];
  for (const m of text.matchAll(URL_HOST_RE)) {
    hosts.push(m[1]!.toLowerCase());
  }
  return hosts;
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

    const visibility = readVisibility(text);
    const internalDomains = readInternalDomains(text);
    // § Visibility modulates the two PII patterns only, and never opens a
    // `refute` escape — it lowers review noise, not the resolution set.
    const piiSeverity: Severity = visibility === "public" ? "error" : "warning";

    const report = (
      entry: EvidenceEntry,
      severity: Severity,
      message: string,
    ): void => {
      findings.push({
        rule: id,
        severity,
        file: "ROADMAP.md",
        line: entry.line,
        message,
      });
    };

    for (const item of splitItems(text)) {
      if (item.id.startsWith("ROADMAP-T-")) continue;

      for (const entry of extractEvidenceEntries(item)) {
        const cats = categoriseEntry(entry.text);
        const quotes = quotedSpans(entry.text);
        const isQuote = cats.includes(4);
        const isUrl = cats.includes(5);

        // Patterns 1-4 are scoped to the quote inside a category-4 entry.
        for (const quote of quotes) {
          if (EMAIL_RE.test(quote)) {
            report(
              entry,
              piiSeverity,
              `${item.id}: email address inside an evidence quote (PII; reformulate or kill — not refutable)`,
            );
          }
          if (looksLikePhone(quote)) {
            report(
              entry,
              piiSeverity,
              `${item.id}: phone-shaped digit run inside an evidence quote (PII; reformulate or kill — not refutable)`,
            );
          }
          if (HANDLE_RE.test(quote)) {
            report(
              entry,
              "warning",
              `${item.id}: @handle inside an evidence quote (identity leak; reformulate or kill — not refutable)`,
            );
          }
          if (NAME_RE.test(quote)) {
            report(
              entry,
              "warning",
              `${item.id}: name-shaped text inside an evidence quote (heuristic; rewrite to a broader role label if it identifies a person)`,
            );
          }
        }

        // Pattern 7: category-4 is a quote, not a dump.
        if (isQuote && entry.lines.length >= 3) {
          report(
            entry,
            "error",
            `${item.id}: category-4 entry spans ${entry.lines.length} lines of pasted content (a quote, not a dump)`,
          );
        }

        // Patterns 5, 6, 8 apply to the whole category-5 entry.
        if (isUrl) {
          if (CRED_URL_RE.test(entry.text)) {
            report(
              entry,
              "error",
              `${item.id}: credential parameter in a competitor URL (token/sig/key/auth/access_token)`,
            );
          }
          for (const host of hostsIn(entry.text)) {
            if (
              internalDomains.some(
                (d) => host === d || host.endsWith(`.${d}`),
              )
            ) {
              report(
                entry,
                "error",
                `${item.id}: category-5 URL on internal domain "${host}" (internal share-link leak)`,
              );
            }
          }
        }
        if (IMAGE_MD_RE.test(entry.text)) {
          report(
            entry,
            "error",
            `${item.id}: image markdown in evidence (screenshots banned per CONVENTIONS.md § 10)`,
          );
        }
      }
    }

    return findings;
  },
};

export const run = validator.run;
