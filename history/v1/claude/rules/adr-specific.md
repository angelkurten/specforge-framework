---
name: ADR-specific rules
description: Format, sections, and status rules for Architecture Decision Records. Loads only when editing ADR-*.md files.
paths:
  - "ADR-*.md"
---

# ADR rules

ADRs document a single architectural decision with alternatives evaluated and trade-offs made explicit. They are distinct from PRDs: PRDs specify what to build and how, ADRs justify why a decision was made. Target length: 100-300 lines.

## Required sections

| # | Section | Purpose |
|---|---|---|
| 1 | **Context** | What situation forces this decision. One to three paragraphs. Cite the signal: incident, review finding, performance bottleneck, compliance requirement. Do not describe the solution yet. |
| 2 | **Decision** | The choice, stated in one to three sentences. Lead with the verb: "We will…". |
| 3 | **Alternatives Considered** | Options rejected with reasons. **At least two alternatives** — if you only considered one, it was not a decision, it was a default. |
| 4 | **Consequences** | What becomes easier and what becomes harder as a direct result of this decision. Both sides. Second-order effects included. |
| 5 | **Trade-offs Accepted** | What pain you are signing up for. "We accept higher write latency in exchange for simpler consistency guarantees." |
| 6 | **Signals to Reconsider** | Concrete, measurable conditions that would make this decision wrong. Use a table with Signal and Action columns. |

Optional: `Cost to Reverse` (include when the cost of undoing is high or non-obvious), `Related Documents` (cross-references to PRDs or ADRs that depend on this decision).

## Header metadata

```markdown
# ADR-NNN: Short Descriptive Title

**Status**: Proposed | Accepted | Superseded by ADR-NNN
**Date**: YYYY-MM-DD
**Decision makers**: <roles, not names: Backend, Security, Product>
**Context PRDs**: PRD-NNN, PRD-MMM   <!-- optional -->
**Supersedes**: ADR-NNN              <!-- optional -->
```

## Status lifecycle

- `Proposed` — under discussion, not yet decided
- `Accepted` — decision made, treated as the answer
- `Superseded by ADR-N` — a newer ADR replaces this one; this file stays frozen

No other status values are permitted.

## Frozen snapshot discipline

Once an ADR reaches `Accepted`, it is not edited except to correct factual errors or to mark it `Superseded`. If the decision needs to change, write a new ADR that declares `Supersedes: ADR-N` and explain what changed and why. The old ADR stays as historical record.

Do not mix PRD rules with ADR rules when editing an ADR. Specifically: ADRs do **not** carry a gate block, do **not** have an `Impacted Projects` table, and do **not** follow the PRD required-sections list. They are a different document type.
