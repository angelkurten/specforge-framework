#!/usr/bin/env python3
"""Mechanical checks a PRD author runs before dispatching the reviewer panel.

Everything here is decidable by a regex, a set join, or a file stat. None of it
is a judgement call, and none of it replaces one — the panel still reads the
document. What it takes off the panel's plate is the class of question a
generative reviewer answers confidently and wrongly: "does every error branch
and every error status have a Test Plan row?" A wrong answer to that question
does not merely fail to find the gap, it *hides* it, because the answer reads
as a completed check. A set join is deterministic and costs nothing, so it
belongs in code.

Usage, from the specforge directory:

    python3 scripts/prd-check.py 012-validation-phase-and-prd-amendment.md
    python3 scripts/prd-check.py --json 0*.md

Exit code 0 when no check reports, 1 when any check reports, 2 on usage error.
Python 3 standard library only.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Optional

# --------------------------------------------------------------------------
# Findings
# --------------------------------------------------------------------------

# `blocker`  — a rule in .claude/rules/ is violated; the document is wrong.
# `look`     — the check cannot decide, and is handing you a place to look.
BLOCKER = "blocker"
LOOK = "look"

CHECK_TITLES = {
    "sections": "1. Required sections, present and in order",
    "siblings": "2. Impacted Projects names resolve in SIBLINGS.md",
    "gate": "3. Gate block schema",
    "gate-tests": "4. Section 9 Path column == gate `tests` list",
    "coverage": "5. Coverage join: error branches / statuses / constraints vs Test Plan",
    "citations": "6. Citation resolution (path:line)",
    "marketing": "7. Marketing language (hard rule 9)",
    "diagrams": "8. Mermaid only (hard rule 3)",
    "spans": "9. Propagation-table span uniqueness",
    "absence": "10. Test Plan rows asserting an absence",
}

CHECK_NOTES = {
    "coverage": (
        "The match below is TEXTUAL, not semantic. It is a prompt to look, not a\n"
        "verdict: a row that tests the branch in different words reports here and\n"
        "costs you a glance, while a branch with no row at all is the defect this\n"
        "check exists to catch. Each report names the closest row it found, so a\n"
        "false positive is dismissed by reading one line."
    ),
    "citations": (
        "Resolution only: a file of that name exists and is long enough. This says\n"
        "NOTHING about whether the cited line still holds the content the PRD\n"
        "claims for it — a line that resolved may have been rewritten under it.\n"
        "A bare basename is resolved by searching the tree; when several files\n"
        "share the name, the longest one decides, so this under-reports rather\n"
        "than guessing which copy was meant."
    ),
}


@dataclass
class Finding:
    check: str
    severity: str
    file: str
    line: Optional[int]
    message: str
    detail: Optional[str] = None

    def to_json(self) -> dict:
        return {
            "check": self.check,
            "severity": self.severity,
            "file": self.file,
            "line": self.line,
            "message": self.message,
            "detail": self.detail,
        }

    def anchor(self) -> str:
        return f"{self.file}:{self.line}" if self.line else self.file


# --------------------------------------------------------------------------
# Markdown structure
# --------------------------------------------------------------------------


@dataclass
class Section:
    level: int
    number: Optional[int]
    sub: Optional[str]      # "4.2" for a level-3 heading, else None
    title: str
    line: int               # 1-based line of the heading
    end: int                # 1-based exclusive end line


@dataclass
class Table:
    header: list[str]
    rows: list[tuple[int, list[str]]]   # (1-based line, cells)
    line: int


@dataclass
class Doc:
    path: Path
    text: str
    lines: list[str]
    in_fence: list[bool]
    fence_info: list[Optional[str]]
    sections: list[Section]
    status: Optional[str]

    @property
    def name(self) -> str:
        return self.path.name


FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
H_RE = re.compile(r"^(#{2,3})\s+(.*?)\s*$")
NUMBERED_H2_RE = re.compile(r"^(\d+)\.\s+")
NUMBERED_H3_RE = re.compile(r"^(\d+)\.(\d+)\s+")
STATUS_RE = re.compile(r"^\*\*Status\*\*:\s*(\S+)", re.M)


def fence_map(lines: list[str]) -> tuple[list[bool], list[Optional[str]]]:
    """Mark every line that lies inside (or opens/closes) a fenced block."""
    in_fence = [False] * len(lines)
    info: list[Optional[str]] = [None] * len(lines)
    opener: Optional[str] = None
    current = ""
    for i, ln in enumerate(lines):
        m = FENCE_RE.match(ln)
        if opener is None:
            # A line like "`` `x` ``" is inline code, not a fence opener.
            if m and not (m.group(1)[0] == "`" and "`" in m.group(2)):
                opener = m.group(1)
                current = m.group(2).strip().lower()
                in_fence[i] = True
                info[i] = current
        else:
            in_fence[i] = True
            info[i] = current
            if (
                m
                and m.group(1)[0] == opener[0]
                and len(m.group(1)) >= len(opener)
                and m.group(2).strip() == ""
            ):
                opener = None
    return in_fence, info


def parse_sections(lines: list[str], in_fence: list[bool]) -> list[Section]:
    found: list[Section] = []
    for i, ln in enumerate(lines):
        if in_fence[i]:
            continue
        m = H_RE.match(ln)
        if not m:
            continue
        level = len(m.group(1))
        title = m.group(2)
        number = None
        sub = None
        if level == 2:
            nm = NUMBERED_H2_RE.match(title)
            if nm:
                number = int(nm.group(1))
        else:
            nm = NUMBERED_H3_RE.match(title)
            if nm:
                number = int(nm.group(1))
                sub = f"{nm.group(1)}.{nm.group(2)}"
        found.append(Section(level, number, sub, title, i + 1, len(lines) + 1))

    # Close each section at the next heading of the same or shallower level.
    for idx, sec in enumerate(found):
        for later in found[idx + 1 :]:
            if later.level <= sec.level:
                sec.end = later.line
                break
    return found


def load(path: Path) -> Doc:
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    in_fence, info = fence_map(lines)
    sm = STATUS_RE.search(text)
    return Doc(
        path=path,
        text=text,
        lines=lines,
        in_fence=in_fence,
        fence_info=info,
        sections=parse_sections(lines, in_fence),
        status=sm.group(1).strip().strip("`") if sm else None,
    )


def split_row(row: str) -> list[str]:
    """Split a markdown table row, honouring the `\\|` escape."""
    body = row.strip()
    if body.startswith("|"):
        body = body[1:]
    if body.endswith("|") and not body.endswith("\\|"):
        body = body[:-1]
    cells = re.split(r"(?<!\\)\|", body)
    return [c.strip().replace("\\|", "|") for c in cells]


DELIM_RE = re.compile(r"^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$")


def find_tables(doc: Doc, lo: int, hi: int) -> list[Table]:
    """Every markdown table whose header lies in the 1-based range [lo, hi)."""
    tables: list[Table] = []
    i = lo - 1
    end = min(hi - 1, len(doc.lines))
    while i < end:
        ln = doc.lines[i]
        if doc.in_fence[i] or "|" not in ln or not ln.strip().startswith("|"):
            i += 1
            continue
        if i + 1 >= end or not DELIM_RE.match(doc.lines[i + 1]) or "|" not in doc.lines[i + 1]:
            i += 1
            continue
        header = split_row(ln)
        rows: list[tuple[int, list[str]]] = []
        j = i + 2
        while j < end and not doc.in_fence[j] and doc.lines[j].strip().startswith("|"):
            rows.append((j + 1, split_row(doc.lines[j])))
            j += 1
        tables.append(Table(header=header, rows=rows, line=i + 1))
        i = j
    return tables


def section_by_number(doc: Doc, n: int) -> Optional[Section]:
    for s in doc.sections:
        if s.level == 2 and s.number == n:
            return s
    return None


def subsections(doc: Doc, sec: Section) -> list[Section]:
    return [s for s in doc.sections if s.level == 3 and sec.line < s.line < sec.end]


def gate_section(doc: Doc) -> Optional[Section]:
    for s in doc.sections:
        if s.level == 2 and s.title.lower().startswith("gate:"):
            return s
    return None


def impacted_section(doc: Doc) -> Optional[Section]:
    for s in doc.sections:
        if s.level == 2 and s.title.strip().lower() == "impacted projects":
            return s
    return None


def strip_md(cell: str) -> str:
    """Drop the markup a table cell wraps a name or path in."""
    out = cell.strip()
    out = re.sub(r"^\*\*(.*)\*\*$", r"\1", out.strip())
    out = out.strip().strip("`").strip()
    return out


def label_text(cell: str) -> str:
    """A human-readable label: emphasis off, code spans left alone."""
    return re.sub(r"\*\*|\*(?=\S)|(?<=\S)\*", "", cell).strip()


# --------------------------------------------------------------------------
# 1. Required sections
# --------------------------------------------------------------------------

SECTION_NAMES = {
    1: "Problem Statement",
    2: "Goals",
    3: "Non-Goals",
    4: "User Flows",
    5: "API",
    6: "Data Model",
    7: "Architecture",
    8: "Security",
    9: "Test Plan",
    10: "Migration Plan",
    11: "Open Questions",
}


def check_sections(doc: Doc, out: list[Finding]) -> None:
    order: list[tuple[str, Optional[int]]] = []

    imp = impacted_section(doc)
    if imp is None:
        out.append(Finding("sections", BLOCKER, doc.name, None,
                           "no `## Impacted Projects` heading"))
    else:
        tables = find_tables(doc, imp.line, imp.end)
        if not tables:
            out.append(Finding("sections", BLOCKER, doc.name, imp.line,
                               "`## Impacted Projects` carries no table"))
        order.append(("Impacted Projects", imp.line))

    for n in range(1, 12):
        sec = section_by_number(doc, n)
        if sec is None:
            out.append(Finding("sections", BLOCKER, doc.name, None,
                               f"missing section {n} ({SECTION_NAMES[n]})"))
        else:
            order.append((f"section {n}", sec.line))

    # The two unnumbered required sections. `Frontend Spec` sits after § 4 and
    # `Observability` after § 10; both were optional once, and both were omitted
    # by every document written while they were. A frozen PRD predates the
    # requirement and hard rule 7 forbids amending it to comply, so skip it.
    frozen = (doc.status or "").lower().startswith(("implemented", "superseded"))
    if not frozen:
        for title in ("Frontend Spec", "Observability"):
            if re.search(r"^#{2,3}\s+" + re.escape(title) + r"\s*$", doc.text, re.M) is None:
                out.append(Finding("sections", BLOCKER, doc.name, None,
                                   f"missing required unnumbered section `{title}`"))

    gate = gate_section(doc)
    if gate is None:
        out.append(Finding("sections", BLOCKER, doc.name, None,
                           "no `## Gate: Promotion to Implemented` heading"))
    else:
        order.append(("Gate block", gate.line))

    for (prev_name, prev_line), (name, line) in zip(order, order[1:]):
        if prev_line is not None and line is not None and line < prev_line:
            out.append(Finding("sections", BLOCKER, doc.name, line,
                               f"{name} appears before {prev_name} "
                               f"(line {line} < line {prev_line}); required order is "
                               "Impacted Projects, 1..11, Gate"))


# --------------------------------------------------------------------------
# 2. Impacted Projects names resolve in SIBLINGS.md
# --------------------------------------------------------------------------


def find_siblings_file(doc: Doc, cwd: Path) -> Optional[Path]:
    candidates = [cwd / "SIBLINGS.md"]
    here = doc.path.resolve().parent
    for parent in [here, *here.parents]:
        candidates.append(parent / "SIBLINGS.md")
    for c in candidates:
        if c.is_file():
            return c
    return None


def registry_names(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    in_fence, _ = fence_map(lines)
    names: list[str] = []
    for i, ln in enumerate(lines):
        if in_fence[i] or not ln.strip().startswith("|"):
            continue
        if i + 1 < len(lines) and DELIM_RE.match(lines[i + 1]):
            header = [h.lower() for h in split_row(ln)]
            if "project" not in header or "path" not in header:
                continue
            col = header.index("project")
            j = i + 2
            while j < len(lines) and lines[j].strip().startswith("|") and not in_fence[j]:
                cells = split_row(lines[j])
                if len(cells) > col:
                    name = strip_md(cells[col])
                    if name and not DELIM_RE.match(name):
                        names.append(name)
                j += 1
    return names


def check_siblings(doc: Doc, cwd: Path, out: list[Finding]) -> None:
    imp = impacted_section(doc)
    if imp is None:
        return
    # A worked example under `examples/` names siblings on purpose that no real
    # registry can carry: it illustrates the shape for an adopting team, whose
    # `SIBLINGS.md` is their own. Checking it against *this* repo's registry
    # reports the example's whole point as a defect.
    if "examples" in doc.path.parts:
        return
    tables = find_tables(doc, imp.line, imp.end)
    if not tables:
        return
    reg_path = find_siblings_file(doc, cwd)
    if reg_path is None:
        out.append(Finding("siblings", LOOK, doc.name, imp.line,
                           "no SIBLINGS.md found at the cwd or above this file — "
                           "the registry check did not run"))
        return
    names = registry_names(reg_path)
    if not names:
        out.append(Finding("siblings", LOOK, doc.name, imp.line,
                           f"{reg_path} carries no parseable `| Project | Path | ... |` "
                           "registry table — the registry check did not run"))
        return
    for line, cells in tables[0].rows:
        if not cells:
            continue
        cited = strip_md(cells[0])
        if not cited:
            continue
        if cited not in names:
            out.append(Finding("siblings", BLOCKER, doc.name, line,
                               f"Impacted Projects cites {cited!r}, which is not a "
                               f"`Project` name in {reg_path.name}",
                               detail="registry holds: " + ", ".join(repr(n) for n in names)))


# --------------------------------------------------------------------------
# 3. Gate block schema
# --------------------------------------------------------------------------

GATE_KEYS = ("commit_hash", "tests", "system_artifact_diff")


@dataclass
class GateField:
    kind: str                     # "scalar" | "list" | "empty-list" | "empty"
    line: int
    values: list[tuple[int, str]] = field(default_factory=list)
    scalar: Optional[str] = None


def strip_yaml_comment(value: str) -> str:
    """Drop a trailing ` # comment`, but not a `#anchor` inside a path."""
    inside_tick = False
    for idx, ch in enumerate(value):
        if ch == "`":
            inside_tick = not inside_tick
        elif ch == "#" and not inside_tick and idx > 0 and value[idx - 1] in " \t":
            return value[:idx]
    return value


def extract_gate(doc: Doc) -> Optional[tuple[int, int, int]]:
    """(heading line, first body line, last body line) of the gate YAML fence."""
    gate = gate_section(doc)
    if gate is None:
        return None
    i = gate.line          # 0-based index of the line after the heading
    end = min(gate.end - 1, len(doc.lines))
    # gate-block.md admits whitespace and HTML comments here — and the comments
    # in this corpus run to a dozen lines, so skip the whole block, not just the
    # lines that happen to carry the delimiters.
    while i < end:
        ln = doc.lines[i].strip()
        if ln == "":
            i += 1
            continue
        if ln.startswith("<!--"):
            while i < end and "-->" not in doc.lines[i]:
                i += 1
            i += 1
            continue
        break
    if i >= end or not doc.lines[i].strip().startswith("```"):
        return None
    if doc.lines[i].strip().lower() not in ("```yaml", "```yml"):
        return None
    body_start = i + 1
    j = body_start
    while j < end and doc.lines[j].strip() != "```":
        j += 1
    return (gate.line, body_start + 1, j)


def parse_gate_yaml(doc: Doc, first: int, last: int) -> dict[str, GateField]:
    """A deliberately small YAML reader for the three-key gate block."""
    fields: dict[str, GateField] = {}
    current: Optional[str] = None
    for n in range(first, last + 1):
        raw = doc.lines[n - 1]
        body = strip_yaml_comment(raw).rstrip()
        if not body.strip() or body.strip().startswith("#"):
            continue
        m = re.match(r"^(\w+):\s*(.*)$", body)
        if m:
            key, rest = m.group(1), m.group(2).strip()
            if rest in ("", "|", ">"):
                fields[key] = GateField("empty", n)
            elif rest == "[]":
                fields[key] = GateField("empty-list", n)
            elif rest.startswith("[") and rest.endswith("]"):
                inner = [v.strip() for v in rest[1:-1].split(",") if v.strip()]
                fields[key] = GateField("list", n, values=[(n, v) for v in inner])
            else:
                fields[key] = GateField("scalar", n, scalar=rest)
            current = key
            continue
        m = re.match(r"^\s*-\s*(.*)$", body)
        if m and current is not None:
            f = fields[current]
            if f.kind in ("empty", "list"):
                f.kind = "list"
                f.values.append((n, m.group(1).strip()))
            elif f.kind == "empty-list":
                f.values.append((n, m.group(1).strip()))
                f.kind = "list"
    return fields


def check_gate(doc: Doc, out: list[Finding]) -> Optional[dict[str, GateField]]:
    loc = extract_gate(doc)
    if loc is None:
        if gate_section(doc) is not None:
            out.append(Finding("gate", BLOCKER, doc.name, gate_section(doc).line,
                               "the `## Gate:` heading is not followed by a ```yaml fence "
                               "(only whitespace and `<!-- -->` may sit between them; a "
                               "bare `#` line there makes the block unparseable)"))
        return None
    _, first, last = loc
    fields = parse_gate_yaml(doc, first, last)

    for key in GATE_KEYS:
        if key not in fields:
            out.append(Finding("gate", BLOCKER, doc.name, first,
                               f"gate block missing required field: {key}"))

    for key in ("tests", "system_artifact_diff"):
        f = fields.get(key)
        if f is None:
            continue
        if f.kind == "scalar":
            out.append(Finding("gate", BLOCKER, doc.name, f.line,
                               f"gate `{key}` is a bare scalar; it is always a YAML list, "
                               "even with one entry"))
        elif f.kind == "empty":
            out.append(Finding("gate", BLOCKER, doc.name, f.line,
                               f"gate `{key}` has no entries and is not written `[]`"))

    status = doc.status
    tbd_ok = status == "Draft"
    for key in GATE_KEYS:
        f = fields.get(key)
        if f is None:
            continue
        holders = ([(f.line, f.scalar)] if f.scalar is not None else []) + f.values
        for line, value in holders:
            if value is not None and value.strip() == "[TBD]" and not tbd_ok:
                out.append(Finding("gate", BLOCKER, doc.name, line,
                                   f"gate `{key}` carries [TBD] while Status is "
                                   f"{status!r}; [TBD] is only legal in a Draft"))

    if status == "Implemented":
        ch = fields.get("commit_hash")
        if ch is not None and (ch.kind != "scalar" or not (ch.scalar or "").strip()):
            out.append(Finding("gate", BLOCKER, doc.name, ch.line,
                               "Status: Implemented requires a non-empty `commit_hash`"))
        t = fields.get("tests")
        if t is not None and not t.values:
            out.append(Finding("gate", BLOCKER, doc.name, t.line,
                               "Status: Implemented requires a non-empty `tests` list"))
        # `system_artifact_diff: []` is legal: gate-block.md sets its length to the
        # number of impacted siblings that maintain a SYSTEM_ARTIFACT.md, and that
        # can be zero. Not reported.
    return fields


# --------------------------------------------------------------------------
# 4. Section 9 Path column == gate `tests`
# --------------------------------------------------------------------------


def test_plan_table(doc: Doc) -> Optional[Table]:
    sec = section_by_number(doc, 9)
    if sec is None:
        return None
    for t in find_tables(doc, sec.line, sec.end):
        header = [h.lower() for h in t.header]
        if any(h.startswith("test") for h in header) and any("path" in h for h in header):
            return t
    return None


PATH_SHAPE_RE = re.compile(r"^[A-Za-z0-9_./@+-]+$")


def looks_like_path(value: str) -> bool:
    return bool(PATH_SHAPE_RE.match(value)) and ("/" in value or "." in value)


def section9_paths(doc: Doc) -> list:
    t = test_plan_table(doc)
    if t is None:
        return []
    header = [h.lower() for h in t.header]
    try:
        col = next(i for i, h in enumerate(header) if "path" in h)
    except StopIteration:
        return []
    out = []
    for line, cells in t.rows:
        if not cells:
            continue
        # A `|` inside a code span splits a GFM row, so a row carrying one ends
        # up with more cells than the header. The Path column is the last one in
        # the Test Plan shape prd-authoring.md prescribes, so fall back to that
        # rather than reading a shifted cell and reporting prose as a path.
        cell = cells[col] if len(cells) == len(header) and len(cells) > col else cells[-1]
        # One cell may name several files: `a.test.ts`, `b.test.ts`.
        parts = re.findall(r"`([^`]+)`", cell) or [cell]
        for part in parts:
            raw = strip_md(part)
            if not raw or raw.upper() in ("TBD", "[TBD]", "-", "N/A") or raw == "\u2014":
                continue
            if not looks_like_path(raw):
                continue
            out.append((line, raw))
    return out


def check_gate_tests(doc: Doc, fields: Optional[dict[str, GateField]], out: list[Finding]) -> None:
    if fields is None:
        return
    f = fields.get("tests")
    if f is None:
        return
    gate_values = [(ln, v) for ln, v in f.values if v.strip() not in ("", "[TBD]")]
    if not gate_values:
        return                      # still [TBD] — the rule says skip
    gate_set = {strip_md(v) for _, v in gate_values}
    sec9 = {p for _, p in section9_paths(doc)}
    sec9_line = section_by_number(doc, 9)

    for ln, v in gate_values:
        if strip_md(v) not in sec9:
            out.append(Finding("gate-tests", BLOCKER, doc.name, ln,
                               f"gate `tests` names {strip_md(v)!r}, which is not in the "
                               "section 9 Path column"))
    for line, p in section9_paths(doc):
        if p not in gate_set:
            out.append(Finding("gate-tests", BLOCKER, doc.name, line,
                               f"section 9 Path {p!r} is not in the gate `tests` list"))
    if not sec9 and gate_set:
        out.append(Finding("gate-tests", BLOCKER, doc.name,
                           sec9_line.line if sec9_line else None,
                           "the gate names tests but section 9 has no parseable Path column"))


# --------------------------------------------------------------------------
# 5. The coverage join
# --------------------------------------------------------------------------

HTTP_STATUS = {
    400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
    415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451,
    500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
}

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "be", "not", "no", "with", "when", "then", "that", "this", "it", "its",
    "as", "at", "by", "from", "was", "were", "has", "have", "had", "but",
    "get", "post", "put", "patch", "delete", "head", "options", "any", "all",
    "new", "old", "per", "via", "into", "out", "up", "down", "if", "so",
}

ERROR_HEADING_RE = re.compile(
    r"\b(error|errors|failure|failures|edge|unhappy|reject|rejection|branch|branches|"
    r"fail|invalid|refus)", re.I)
BRANCH_HEADER_RE = re.compile(r"^(branch|error|failure|condition|case|scenario)", re.I)

# A primary key is created by the table definition itself and is not a thing a
# team writes a test for: `_pkey` and the bare words `PRIMARY KEY` are excluded
# deliberately, because every column table in every PRD would otherwise report.
CONSTRAINT_ID_RE = re.compile(
    r"\b([a-z][a-z0-9]*(?:_[a-z0-9]+)*_(?:idx|index|key|fkey|uniq|unique|check|chk|fk))\b")
# Case-sensitive on purpose: `references`, `check` and `unique` are ordinary
# English words and fired on prose in four PRDs of the corpus. SQL spells its
# keywords upper-case, and that is the only spelling worth matching.
CONSTRAINT_WORD_RE = re.compile(
    r"\b(NOT\s+NULL|UNIQUE(?:\s+INDEX)?|CHECK\s*\(|FOREIGN\s+KEY|REFERENCES|"
    r"ON\s+DELETE\s+\w+)\b")


@dataclass
class Obligation:
    kind: str
    label: str
    line: int
    all_of: list[str]
    any_of: list[str] = field(default_factory=list)


def stem(token: str) -> str:
    for suffix in ("ies", "ing", "ed", "es", "s"):
        if len(token) > len(suffix) + 2 and token.endswith(suffix):
            return token[: -len(suffix)]
    return token


# A code span naming a symbol rather than an English word: `IMPL_MODE`,
# `.specforge/manifest.json`, `CHANGELOG.md`. `update` and `--force` are words a
# Test Plan row uses for a dozen unrelated reasons and carry no signal.
DISTINCTIVE_RE = re.compile(r"^(?=.{4,})[\w./-]*(?:[_./]|[A-Z])[\w./-]*$")


def distinctive_identifiers(text: str) -> list:
    """The symbol-shaped code spans in a branch label.

    When a branch names one, that identifier — not the branch's English words —
    is what a Test Plan row naming the same branch will carry. Three of three
    error-branch findings sampled from this corpus were wrong for exactly this
    reason: the row was there and used none of the branch's other words.
    """
    out = []
    for span in re.findall(r"`([^`]+)`", text):
        span = span.strip()
        if DISTINCTIVE_RE.match(span) and span.lower() not in STOPWORDS:
            out.append(span.lower())
    return out


def plain_label(text: str) -> str:
    """A branch label without its parenthetical asides.

    `Account disabled (status != active)` is one branch and its tokens are
    `account` and `disabled`; dragging `status` and `active` in makes the join
    demand four words of a row that legitimately names two. Code spans stay —
    in a list-shaped branch the command name is the distinctive token.
    """
    return re.sub(r"\([^)]*\)", " ", text)


def tokens_of(text: str) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9_]{2,}", text.lower())
    out: list[str] = []
    for w in words:
        if w in STOPWORDS:
            continue
        if w not in out:
            out.append(w)
    return out


def token_hits(token: str, haystack: str) -> bool:
    return token in haystack or stem(token) in haystack


def make_branch(label: str, text: str, line: int) -> Optional[Obligation]:
    """One error-branch obligation, keyed on its identifier when it has one."""
    idents = distinctive_identifiers(text)
    if idents:
        return Obligation("error branch", label, line, [], idents)
    toks = tokens_of(plain_label(text))
    return Obligation("error branch", label, line, toks) if toks else None


def collect_error_branches(doc: Doc) -> list[Obligation]:
    sec = section_by_number(doc, 4)
    if sec is None:
        return []
    obligations: list[Obligation] = []
    subs = subsections(doc, sec)
    # Ranges to mine: every error-flavoured subsection, plus any table anywhere
    # in section 4 whose first column is a Branch / Error / Condition column.
    ranges: list[tuple[int, int, str]] = [
        (s.line, s.end, s.sub or s.title) for s in subs if ERROR_HEADING_RE.search(s.title)
    ]
    mined_lines: set[int] = set()
    for lo, hi, label in ranges:
        for t in find_tables(doc, lo, hi):
            for line, cells in t.rows:
                if not cells or not cells[0].strip():
                    continue
                mined_lines.add(line)
                text = label_text(cells[0])
                ob = make_branch(f"{label}: {text}", text, line)
                if ob:
                    obligations.append(ob)
        for i in range(lo, min(hi, len(doc.lines) + 1)):
            if doc.in_fence[i - 1]:
                continue
            m = re.match(r"^(?:[-*+]|\d+\.)\s+(.*\S)\s*$", doc.lines[i - 1])
            if m and i not in mined_lines:
                text = label_text(re.sub(r"\s*[-–—:]\s.*$", "", m.group(1)))
                ob = make_branch(f"{label}: {text}", text, i)
                if ob:
                    obligations.append(ob)
    # Branch-shaped tables outside an error-flavoured subsection.
    for t in find_tables(doc, sec.line, sec.end):
        if not t.header or not BRANCH_HEADER_RE.match(t.header[0].strip()):
            continue
        for line, cells in t.rows:
            if line in mined_lines or not cells or not cells[0].strip():
                continue
            text = label_text(cells[0])
            ob = make_branch(text, text, line)
            if ob:
                obligations.append(ob)
    return obligations


def collect_statuses(doc: Doc) -> list[Obligation]:
    sec = section_by_number(doc, 5)
    if sec is None:
        return []
    subs = subsections(doc, sec)

    def context_for(line: int) -> tuple[str, list[str]]:
        for s in reversed(subs):
            if s.line <= line < s.end:
                ident = " ".join(re.findall(r"`([^`]+)`", s.title)) or s.title
                return (s.sub or s.title, tokens_of(ident))
        return (f"section {sec.number}", [])

    seen: set[tuple[str, int]] = set()
    obligations: list[Obligation] = []
    for i in range(sec.line, min(sec.end, len(doc.lines) + 1)):
        line_text = doc.lines[i - 1]
        for m in re.finditer(r"(?<![\w.])([45]\d\d)(?![\w.])", line_text):
            code = int(m.group(1))
            if code not in HTTP_STATUS:
                continue
            label, keys = context_for(i)
            if (label, code) in seen:
                continue
            seen.add((label, code))
            obligations.append(Obligation("error status", f"{label} -> {code}", i,
                                          [str(code)], keys))
    return obligations


def collect_constraints(doc: Doc) -> list[Obligation]:
    sec = section_by_number(doc, 6)
    if sec is None:
        return []
    obligations: list[Obligation] = []
    seen: set[str] = set()
    named_lines: set[int] = set()
    for i in range(sec.line, min(sec.end, len(doc.lines) + 1)):
        line_text = doc.lines[i - 1]
        for m in CONSTRAINT_ID_RE.finditer(line_text):
            named_lines.add(i)
            ident = m.group(1)
            if ident in seen:
                continue
            seen.add(ident)
            obligations.append(Obligation("constraint", ident, i, [ident]))
        if i in named_lines:
            # The named constraint on this line is the more precise anchor;
            # a second obligation for the keyword beside it is a duplicate.
            continue
        for m in CONSTRAINT_WORD_RE.finditer(line_text):
            word = re.sub(r"\s+", " ", m.group(1).strip().rstrip("(")).upper()
            # Anchor a bare constraint keyword to the nearest identifier on the
            # line, so `NOT NULL` on three columns is three obligations and not
            # one indistinguishable blob.
            if line_text.strip().startswith("|"):
                cells = split_row(line_text)
                subject = strip_md(cells[0]) if cells else f"line {i}"
            else:
                nearby = re.findall(r"`([A-Za-z_][\w.]*)`", line_text)
                subject = nearby[0] if nearby else f"line {i}"
            key = f"{word}:{subject}"
            if key in seen:
                continue
            seen.add(key)
            subject_terms = tokens_of(subject) or [subject.lower()]
            obligations.append(Obligation("constraint", f"{word} on {subject}", i,
                                          subject_terms + [word.split()[0].lower()]))
    return obligations


def test_plan_rows(doc: Doc) -> list[tuple[int, str]]:
    t = test_plan_table(doc)
    if t is None:
        return []
    return [(line, " | ".join(cells).lower()) for line, cells in t.rows]


def check_coverage(doc: Doc, out: list[Finding]) -> None:
    obligations = (collect_error_branches(doc) + collect_statuses(doc)
                   + collect_constraints(doc))
    if not obligations:
        return
    rows = test_plan_rows(doc)
    for ob in obligations:
        terms = ob.all_of + ob.any_of
        if not terms:
            continue
        # A two-word branch must match both words; a seven-word one matched
        # word-for-word would never be found, because a Test Plan row names the
        # same branch in its own vocabulary. Three quarters, floor of two.
        need = max(min(len(ob.all_of), 2), math.ceil(0.75 * len(ob.all_of)))
        best_score = -1.0
        best_row: Optional[tuple[int, str]] = None
        covered = False
        for line, text in rows:
            all_hit = sum(1 for t in ob.all_of if token_hits(t, text)) >= need
            any_hit = (not ob.any_of) or any(token_hits(t, text) for t in ob.any_of)
            hits = sum(1 for t in terms if token_hits(t, text))
            score = hits / len(terms)
            if score > best_score:
                best_score, best_row = score, (line, text)
            if all_hit and any_hit:
                covered = True
                break
        if covered:
            continue
        if best_row is None:
            detail = "section 9 has no parseable Test Plan rows"
        else:
            excerpt = best_row[1]
            if len(excerpt) > 150:
                excerpt = excerpt[:147] + "..."
            detail = (f"closest row is line {best_row[0]} "
                      f"({best_score:.0%} of terms): {excerpt}")
        out.append(Finding("coverage", LOOK, doc.name, ob.line,
                           f"{ob.kind} {ob.label!r} — no section 9 row textually covers it "
                           f"(needs {need} of {ob.all_of}"
                           + (f" and one of {ob.any_of}" if ob.any_of else "") + ")",
                           detail=detail))


# --------------------------------------------------------------------------
# 6. Citation resolution
# --------------------------------------------------------------------------

CITATION_RE = re.compile(
    r"(?<![\w:/@-])((?:\.{1,2}/)?(?:[\w.-]+/)*[\w.-]+\.[A-Za-z][A-Za-z0-9]{0,4}):(\d+)(?:-(\d+))?(?![\w.])")


SKIP_DIRS = {".git", "node_modules", "dist", "dist-scripts", "build", ".specforge",
             "worktrees", "__pycache__", ".venv"}

_BASENAME_INDEX: dict = {}


def basename_index(root: Path) -> dict:
    """Every file under `root`, indexed by basename.

    The corpus cites by basename far more often than by path — `workflow.md:138`,
    not `.claude/rules/workflow.md:138` — so a resolver that only tries the
    literal path reports 95% "no such file" and says nothing about rot, which is
    the thing worth knowing. A basename that resolves to several files is not a
    finding: if any candidate is long enough, the citation is treated as landing.
    """
    key = str(root)
    if key in _BASENAME_INDEX:
        return _BASENAME_INDEX[key]
    index: dict = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        index.setdefault(path.name, []).append(path)
    _BASENAME_INDEX[key] = index
    return index


def line_count(path: Path, cache: dict) -> int:
    if path not in cache:
        try:
            # splitlines, not split("\n"): a file ending in a newline would
            # otherwise report one line more than `wc -l` does, and the check
            # would accept a citation one past the end.
            cache[path] = len(path.read_text(encoding="utf-8", errors="replace").splitlines())
        except OSError:
            cache[path] = -1
    return cache[path]


def check_citations(doc: Doc, cwd: Path, out: list[Finding]) -> None:
    roots = [cwd, doc.path.resolve().parent]
    reported: set = set()
    cache: dict = {}
    for i, line_text in enumerate(doc.lines, start=1):
        for m in CITATION_RE.finditer(line_text):
            rel, start_s, end_s = m.group(1), m.group(2), m.group(3)
            if "://" in line_text[: m.start()][-8:]:
                continue
            high = int(end_s) if end_s else int(start_s)

            candidates = []
            for root in roots:
                candidate = (root / rel)
                if candidate.is_file():
                    candidates.append(candidate.resolve())
                    break
            if not candidates:
                # `scripts/prepublish.ts:111` names a real file under a partial
                # path; a citation into a directory the tree no longer has names
                # one that is gone. Suffix-match so the second reports and the
                # first does not.
                pool = basename_index(cwd).get(rel.rsplit("/", 1)[-1], [])
                suffix = "/" + rel if "/" in rel else None
                candidates = [c for c in pool
                              if suffix is None or str(c).endswith(suffix)]

            key = (rel, start_s, end_s)
            if key in reported:
                continue
            if not candidates:
                reported.add(key)
                out.append(Finding("citations", BLOCKER, doc.name, i,
                                   f"citation {m.group(0)} — no file of that name under "
                                   f"{cwd}"))
                continue
            lengths = [line_count(c, cache) for c in candidates]
            lengths = [n for n in lengths if n >= 0]
            if not lengths:
                continue
            if high > max(lengths):
                reported.add(key)
                if len(candidates) == 1:
                    try:
                        where = str(candidates[0].relative_to(cwd.resolve()))
                    except ValueError:
                        where = str(candidates[0])
                else:
                    where = f"{len(candidates)} files named {rel}"
                out.append(Finding("citations", BLOCKER, doc.name, i,
                                   f"citation {m.group(0)} — {where} has "
                                   f"{max(lengths)} lines"))


# --------------------------------------------------------------------------
# 7. Marketing language
# --------------------------------------------------------------------------

FORBIDDEN = ["blazingly fast", "enterprise-grade", "best-in-class", "robust", "seamless"]
QUOTE_CHARS = set('"\'`\u201c\u201d\u2018\u2019')


def check_marketing(doc: Doc, out: list[Finding]) -> None:
    for i, line_text in enumerate(doc.lines, start=1):
        if doc.in_fence[i - 1]:
            continue
        lower = line_text.lower()
        for phrase in FORBIDDEN:
            at = lower.find(phrase)
            while at != -1:
                before = line_text[at - 1] if at > 0 else ""
                after = line_text[at + len(phrase)] if at + len(phrase) < len(line_text) else ""
                # Use vs. mention: hard rule 9 forbids using the phrase, not
                # naming it, and a PRD about the rule has to name it.
                if before in QUOTE_CHARS and after in QUOTE_CHARS:
                    at = lower.find(phrase, at + 1)
                    continue
                out.append(Finding("marketing", BLOCKER, doc.name, i,
                                   f"forbidden marketing phrase: {phrase!r}"))
                break
            else:
                continue


# --------------------------------------------------------------------------
# 8. Mermaid only
# --------------------------------------------------------------------------

# "No persisted schema changes." / "No component or dispatch edge changes."
# A section whose own first sentence says the change adds nothing here is not
# a section missing its diagram.
DECLARES_NONE_RE = re.compile(
    r"^\s*(?:no|none|not|there\s+(?:is|are)\s+no)\b|"
    r"\bno\s+(?:new\s+|changed\s+|persisted\s+)?"
    r"(?:schema|database|data\s+model|entit\w*|tables?|columns?|components?|"
    r"user-visible|flows?|diagrams?|migrations?|dispatch|runtime)\b",
    re.I)

BOX_CHARS = set("\u250c\u2510\u2514\u2518\u251c\u2524\u252c\u2534\u253c\u2500\u2502"
                "\u2554\u2557\u255a\u255d\u2550\u2551\u256c")
TREE_RE = re.compile(r"[\u251c\u2514]\u2500\u2500 ")
BOX_ART_RE = re.compile(r"^\s*[+|][-+|\s]{5,}[+|]\s*$")
ARROW_ART_RE = re.compile(r"(-{3,}>|<-{3,}|={3,}>)")


def fenced_blocks(doc: Doc) -> list[tuple[int, int, str]]:
    blocks: list[tuple[int, int, str]] = []
    i = 0
    while i < len(doc.lines):
        if doc.in_fence[i]:
            start = i
            info = doc.fence_info[i] or ""
            while i < len(doc.lines) and doc.in_fence[i] and (doc.fence_info[i] or "") == info:
                i += 1
            blocks.append((start + 1, i, info))
        else:
            i += 1
    return blocks


def check_diagrams(doc: Doc, out: list[Finding]) -> None:
    for start, end, info in fenced_blocks(doc):
        if info.startswith("mermaid"):
            continue
        body = doc.lines[start:end - 1]
        if not body:
            continue
        joined = "\n".join(body)
        if TREE_RE.search(joined):
            continue                      # a file-layout tree is not a diagram
        box_lines = sum(1 for ln in body if any(c in BOX_CHARS for c in ln))
        art_lines = sum(1 for ln in body if BOX_ART_RE.match(ln))
        arrow_lines = sum(1 for ln in body if ARROW_ART_RE.search(ln))
        if box_lines >= 2 or art_lines >= 2 or (arrow_lines >= 2 and art_lines >= 1):
            out.append(Finding("diagrams", BLOCKER, doc.name, start,
                               f"fenced block (info {info or 'none'!r}) looks like ASCII art; "
                               "hard rule 3 admits Mermaid only"))

    for n in (4, 6, 7):
        sec = section_by_number(doc, n)
        if sec is None:
            continue
        has_mermaid = any(
            (doc.fence_info[i - 1] or "").startswith("mermaid")
            for i in range(sec.line, min(sec.end, len(doc.lines) + 1))
        )
        # A section that says "this change has no data model" needs no ERD, and a
        # check that reports one on every framework-internal PRD is a check
        # nobody reads. Two gates: the section must have substance (a dozen
        # lines of prose, or a table), and it must not open by declaring that
        # the change adds no surface here.
        body = [doc.lines[i - 1]
                for i in range(sec.line + 1, min(sec.end, len(doc.lines) + 1))]
        substantive = sum(1 for ln in body if ln.strip()) >= 12 or any(
            len(t.rows) >= 3 for t in find_tables(doc, sec.line, sec.end))
        opening = " ".join([ln for ln in body if ln.strip()][:3])
        if not has_mermaid and substantive and not DECLARES_NONE_RE.search(opening):
            out.append(Finding("diagrams", LOOK, doc.name, sec.line,
                               f"section {n} ({SECTION_NAMES[n]}) carries no ```mermaid fence "
                               "— required for a non-trivial flow, a new or changed entity, "
                               "or a flow spanning more than two components"))


# --------------------------------------------------------------------------
# 9. Propagation-table span uniqueness
# --------------------------------------------------------------------------

SPAN_CELL_RE = re.compile(r"the\s+span\s+`([^`]+)`", re.I)
LINE_ANCHOR_RE = re.compile(r"(?::|\bline\s+)\d+\b", re.I)


def check_spans(doc: Doc, cwd: Path, out: list[Finding]) -> None:
    roots = [cwd, doc.path.resolve().parent]
    for t in find_tables(doc, 1, len(doc.lines) + 1):
        header = [h.strip().lower() for h in t.header]
        if "site" not in header:
            continue
        site_col = header.index("site")
        file_col = next((i for i, h in enumerate(header) if h.startswith("file")), None)
        for line, cells in t.rows:
            if len(cells) <= site_col:
                continue
            site = cells[site_col]
            m = SPAN_CELL_RE.search(site)
            if not m:
                if LINE_ANCHOR_RE.search(site) and "\u00a7" not in site:
                    out.append(Finding("spans", BLOCKER, doc.name, line,
                                       f"Site cell {site!r} anchors by a line number; "
                                       "a Site is a greppable span, a named structural "
                                       "unit, or the literal `new`"))
                continue
            span = m.group(1)
            if file_col is None:
                out.append(Finding("spans", LOOK, doc.name, line,
                                   f"span {span!r} has no File(s) column to check it against"))
                continue
            targets = re.findall(r"`([^`]+)`", cells[file_col]) or [strip_md(cells[file_col])]
            for rel in targets:
                rel = rel.strip()
                if not rel:
                    continue
                resolved = None
                for root in roots:
                    candidate = (root / rel)
                    if candidate.is_file():
                        resolved = candidate
                        break
                if resolved is None:
                    out.append(Finding("spans", BLOCKER, doc.name, line,
                                       f"File(s) cell names {rel!r}, which does not resolve"))
                    continue
                try:
                    body = resolved.read_text(encoding="utf-8", errors="replace")
                except OSError as exc:
                    out.append(Finding("spans", LOOK, doc.name, line,
                                       f"could not read {rel}: {exc}"))
                    continue
                count = body.count(span)
                if count != 1:
                    out.append(Finding("spans", BLOCKER, doc.name, line,
                                       f"span {span!r} occurs {count} times in {rel}; "
                                       "grep -o -F '<span>' <file> | wc -l must print 1"))


# --------------------------------------------------------------------------
# 10. Test Plan rows asserting an absence
# --------------------------------------------------------------------------

ABSENCE_RES = [
    re.compile(r"\bnever\b", re.I),
    re.compile(r"\bnothing\b", re.I),
    re.compile(r"\b(?:no|zero)\s+(?:new\s+|extra\s+)?"
               r"(?:rows?|entr(?:y|ies)|logs?|log\s+line|calls?|writes?|fetch(?:es)?|"
               r"requests?|quer(?:y|ies)|select|insert|records?|output|side.effects?|"
               r"diff|changes?|files?|dispatch(?:es)?|findings?)\b", re.I),
    re.compile(r"\b(?:is|are|was|were|does|do|did|must|shall|should|will)\s+not\s+"
               r"(?:be\s+)?(?:called|logged|written|invoked|emitted|fetched|persisted|"
               r"present|re-?pointed|discarded|dispatched|run|read|reached|stored|"
               r"recorded|mutated|touched|overwritten)\b", re.I),
    re.compile(r"\bassert(?:s|ing)?\s+no\b", re.I),
    re.compile(r"\bwithout\s+(?:writing|logging|calling|reading|touching|dispatching)\b", re.I),
]

FAILS_AGAINST_RES = [
    re.compile(r"\bfail(?:s|ing)?\s+(?:against|on|for)\b", re.I),
    re.compile(r"\bwould\s+fail\b", re.I),
    re.compile(r"\bbroken\b", re.I),
    re.compile(r"\bregression\b", re.I),
    re.compile(r"\ban?\s+implementation\s+that\b", re.I),
    re.compile(r"\bagainst\s+(?:a|an|the)\b", re.I),
    re.compile(r"\bna(?:ï|i)ve\b", re.I),
    re.compile(r"\bcatches\b", re.I),
]


def check_absence(doc: Doc, out: list[Finding]) -> None:
    t = test_plan_table(doc)
    if t is None:
        return
    header = [h.lower() for h in t.header]
    path_col = next((i for i, h in enumerate(header) if "path" in h), None)
    for line, cells in t.rows:
        prose_cells = [c for i, c in enumerate(cells) if i != path_col]
        text = " ".join(prose_cells)
        if not text.strip():
            continue
        hit = next((r.search(text) for r in ABSENCE_RES if r.search(text)), None)
        if hit is None:
            continue
        if any(r.search(text) for r in FAILS_AGAINST_RES):
            continue
        excerpt = re.sub(r"\s+", " ", text).strip()
        if len(excerpt) > 200:
            excerpt = excerpt[:197] + "..."
        out.append(Finding("absence", LOOK, doc.name, line,
                           f"Test Plan row asserts an absence ({hit.group(0).strip()!r}) "
                           "without naming the broken implementation it would fail "
                           "against; a green suite is no evidence for it",
                           detail=excerpt))


# --------------------------------------------------------------------------
# Driver
# --------------------------------------------------------------------------


def is_prd_shaped(doc: Doc) -> bool:
    """Whether this document is a PRD at all.

    An ADR carries its own headings, and running the eleven-section check over
    one produces eleven findings that all say the same thing. Say it once.
    """
    if re.match(r"^(ADR|AgDR)-\d{3}-", doc.name):
        return False
    # An ADR numbers its own sections 1-7, so a count alone does not separate
    # the two shapes. Sections 9, 10 and 11 are the PRD's signature — an ADR
    # carries none of them.
    tail = sum(1 for n in (9, 10, 11) if section_by_number(doc, n) is not None)
    return tail >= 2


def check_file(path: Path, cwd: Path) -> list[Finding]:
    doc = load(path)
    out: list[Finding] = []
    if not is_prd_shaped(doc):
        out.append(Finding("sections", LOOK, doc.name, 1,
                           "this file is not PRD-shaped (an ADR/AgDR filename, or fewer "
                           "than two of sections 9, 10 and 11) — the PRD-shape checks were "
                           "skipped. An ADR has its own shape; see adr-specific.md"))
        check_marketing(doc, out)
        check_citations(doc, cwd, out)
        return out
    check_sections(doc, out)
    check_siblings(doc, cwd, out)
    fields = check_gate(doc, out)
    check_gate_tests(doc, fields, out)
    check_coverage(doc, out)
    check_citations(doc, cwd, out)
    check_marketing(doc, out)
    check_diagrams(doc, out)
    check_spans(doc, cwd, out)
    check_absence(doc, out)
    return out


def render(findings: list[Finding], files: list[Path]) -> str:
    lines: list[str] = []
    by_check: dict[str, list[Finding]] = {}
    for f in findings:
        by_check.setdefault(f.check, []).append(f)
    for check, title in CHECK_TITLES.items():
        group = by_check.get(check)
        if not group:
            continue
        lines.append("")
        lines.append(title)
        lines.append("-" * len(title))
        note = CHECK_NOTES.get(check)
        if note:
            lines.append(note)
            lines.append("")
        for f in sorted(group, key=lambda f: (f.file, f.line or 0)):
            lines.append(f"  {f.anchor()}: {f.message}")
            if f.detail:
                lines.append(f"      {f.detail}")
    lines.append("")
    blockers = sum(1 for f in findings if f.severity == BLOCKER)
    looks = len(findings) - blockers
    lines.append(f"{len(files)} file(s) checked: {blockers} blocker, {looks} look-here.")
    if not findings:
        lines.append("clean.")
    return "\n".join(lines).lstrip("\n")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        prog="prd-check.py",
        description="Mechanical pre-panel checks for a specforge PRD.")
    parser.add_argument("files", nargs="+", help="PRD markdown files")
    parser.add_argument("--json", action="store_true", dest="as_json",
                        help="emit the same findings as JSON on stdout")
    args = parser.parse_args(argv)

    cwd = Path.cwd()
    paths: list[Path] = []
    for raw in args.files:
        p = Path(raw)
        if not p.is_file():
            sys.stderr.write(f"prd-check: no such file: {raw}\n")
            return 2
        paths.append(p)

    findings: list[Finding] = []
    for p in paths:
        try:
            findings.extend(check_file(p, cwd))
        except Exception as exc:                       # noqa: BLE001
            sys.stderr.write(f"prd-check: {p}: {type(exc).__name__}: {exc}\n")
            return 2

    if args.as_json:
        payload = {
            "files": [str(p) for p in paths],
            "findings": [f.to_json() for f in findings],
            "counts": {
                "blocker": sum(1 for f in findings if f.severity == BLOCKER),
                "look": sum(1 for f in findings if f.severity == LOOK),
                "total": len(findings),
            },
        }
        print(json.dumps(payload, indent=2))
    else:
        print(render(findings, paths))

    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
