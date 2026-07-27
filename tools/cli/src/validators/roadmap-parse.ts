// Shared ROADMAP.md parsing for the roadmap validators.
//
// One parser, two consumers (roadmap-evidence-categories, roadmap-pii). Field
// headings are written bold by `templates/roadmap.md` (`**Evidence**:`), so
// every field regex tolerates the `**` wrapper — matching only the unbolded
// form made the evidence validator blind to its own template's output.

export interface RoadmapItem {
  id: string;
  /** 0-based line index of the `### ROADMAP-NNN` heading. */
  startLine: number;
  endLine: number;
  body: string;
}

export interface EvidenceEntry {
  /** Entry text, `- ` stripped, continuation lines joined with newlines. */
  text: string;
  /** Raw lines of the entry, including continuations. */
  lines: string[];
  /** 1-based line number in ROADMAP.md. */
  line: number;
}

const ITEM_HEADING_RE = /^###\s+ROADMAP-([0-9T-]+)/;
const EVIDENCE_FIELD_RE = /^\*{0,2}Evidence\*{0,2}:/;
const FIELD_RE = /^\*{0,2}[A-Z][A-Za-z /_-]*\*{0,2}:/;
const VISIBILITY_RE = /^\*{0,2}Visibility\*{0,2}:\s*(public|private)\b/im;
const INTERNAL_DOMAINS_RE = /^\*{0,2}Internal domains\*{0,2}:\s*(.+)$/im;

export function splitItems(text: string): RoadmapItem[] {
  const lines = text.split("\n");
  const starts: Array<{ id: string; line: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = ITEM_HEADING_RE.exec(lines[i]!);
    if (m) starts.push({ id: m[1]!, line: i });
  }
  const items: RoadmapItem[] = [];
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

export function extractEvidenceEntries(item: RoadmapItem): EvidenceEntry[] {
  const lines = item.body.split("\n");
  const startIdx = lines.findIndex((l) => EVIDENCE_FIELD_RE.test(l));
  if (startIdx === -1) return [];

  const entries: EvidenceEntry[] = [];
  let current: EvidenceEntry | null = null;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (FIELD_RE.test(line)) break;
    if (line.trim() === "") {
      // A blank line may separate bullets; only the next field ends the block.
      if (FIELD_RE.test(lines[i + 1] ?? "")) break;
      continue;
    }
    const bullet = /^\s*-\s+(.*)$/.exec(line);
    if (bullet) {
      current = {
        text: bullet[1]!,
        lines: [line],
        line: item.startLine + i + 1,
      };
      entries.push(current);
    } else if (current) {
      current.text += `\n${line}`;
      current.lines.push(line);
    }
  }
  return entries;
}

export type Category = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const URL_RE = /https?:\/\/\S+/;
const TICKET_RE = /\b[A-Z][A-Z0-9]+-\d+\b/;
const HYPOTHESIS_RE = /^hypothesis:/i;
const QUOTE_RE = /['"][^'"]+['"]/;
const METRIC_HINT_RE =
  /\b(\d+(\.\d+)?\s*(\/|per|%)|metric|board|dashboard|last\s+\d+\s+days?)\b/i;
const RESEARCH_HINT_RE = /\b(usability test|N\s*=\s*\d+|interview|survey)\b/i;
const PRD_REF_RE = /\bPRD-\d{3}\b/;

export function categoriseEntry(entry: string): Category[] {
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

/** Quoted spans inside an entry — the scope the PII table calls "a quote". */
export function quotedSpans(entry: string): string[] {
  return entry.match(/['"][^'"]+['"]/g) ?? [];
}

/** `.claude/rules/roadmap.md` § Visibility: strict-by-default when absent. */
export function readVisibility(text: string): "public" | "private" {
  const m = VISIBILITY_RE.exec(text);
  return m?.[1]?.toLowerCase() === "private" ? "private" : "public";
}

/**
 * Team-configurable internal-domain allowlist, read from an optional
 * `**Internal domains**:` header line in ROADMAP.md.
 * ponytail: header field rather than a new config file; move it into
 * .specforge/manifest.json if a team needs it shared across repos.
 */
export function readInternalDomains(text: string): string[] {
  const m = INTERNAL_DOMAINS_RE.exec(text);
  if (!m) return [];
  return m[1]!
    .split(",")
    .map((d) => d.trim().replace(/^`|`$/g, "").toLowerCase())
    .filter((d) => d.length > 0 && d !== "—" && d !== "-");
}
