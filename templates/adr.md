# ADR-NNN: <!-- Short descriptive title -->

**Status**: Proposed
**Date**: YYYY-MM-DD
**Decision makers**: <!-- roles, not names: Backend, Security, Product -->
**Context PRDs**: <!-- PRD-XXX, PRD-YYY, or "None" -->
**Supersedes**: <!-- ADR-XXX, or "None" (optional) -->

<!--
  Status lifecycle:
    Proposed             — under discussion, not yet decided
    Accepted             — decision made, treated as the answer
    Superseded by ADR-N  — a newer ADR replaces this one; keep this file frozen

  ADRs document a single architectural decision with alternatives evaluated
  and trade-offs made explicit. Target length: 100-300 lines. If you are
  specifying what to build rather than why you chose an approach, you want a
  PRD instead. See [CONVENTIONS.md](../CONVENTIONS.md) for the ADR vs PRD
  split.
-->

---

## 1. Context

<!--
  What triggered this decision? What problem forced the team to pick an
  approach instead of muddling through? Cite the signal: an incident, a PRD
  review finding, a performance bottleneck, a compliance requirement.
  One to three paragraphs. Do not describe the solution yet.
-->

## 2. Decision

<!--
  State the chosen option in one to three sentences. Lead with the verb:
  "We will …". If the decision is still pending, keep Status as "Proposed"
  and note that here; do not leave the section empty.
-->

## 3. Alternatives Considered

<!--
  Every ADR must list at least two alternatives with pros and cons. If you
  only considered one option, the decision was not a decision — it was a
  default. Go brainstorm more options before writing the ADR.
-->

### Option A — <!-- short name -->

<!-- One paragraph description. -->

**Pros**:
- <!-- pro 1 -->

**Cons**:
- <!-- con 1 -->

### Option B — <!-- short name -->

<!-- One paragraph description. -->

**Pros**:
- <!-- pro 1 -->

**Cons**:
- <!-- con 1 -->

## 4. Consequences

<!--
  What becomes easier and what becomes harder as a direct result of this
  decision. Cover both sides. This is the section future maintainers read
  when they want to know whether the decision is still earning its keep.
  Include second-order effects, not just the immediate rationale.
-->

**Positive**:

- <!-- what becomes easier -->

**Negative**:

- <!-- what becomes harder -->

## 5. Trade-offs Accepted

<!--
  Be honest about what you are giving up. "We accept higher write latency in
  exchange for simpler consistency guarantees." If you cannot name a
  trade-off, you probably have not examined the decision hard enough.
-->

- <!-- trade-off 1 -->
- <!-- trade-off 2 -->

## 6. Signals to Reconsider

<!--
  Concrete, measurable conditions that would make this decision wrong. Use
  a table with the signal and the action. This is how future maintainers
  know when to reopen the ADR.
-->

| Signal | Action |
|--------|--------|
| <!-- metric or event --> | <!-- revisit, supersede, accelerate --> |

## 7. Cost to Reverse *(optional)*

<!--
  Optional section. Include when the cost of undoing this decision is high
  or non-obvious, or when the team wants a concrete anchor for the
  "Signals to Reconsider" table. Rough effort estimate to back this
  decision out if the signals above fire. Ranges are fine ("2-4 weeks for
  one engineer"). Skip the section entirely if the cost is clearly low.
-->

---

## Related Documents

- <!-- [PRD-NNN: Title](../prds/NNN-title.md) -->
