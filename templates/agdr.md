# AgDR-NNN: <!-- Short descriptive title -->

**Status**: Recorded
**Date**: YYYY-MM-DD
**Agent**: <!-- the sub-agent role that made the decision, e.g. python-expert, backend-architect -->
**Triggering PRD**: <!-- PRD-NNN being implemented when the decision was made -->
**Sibling**: <!-- project name from SIBLINGS.md whose code the decision affects -->
**Commit**: <!-- commit hash where the decision landed -->

<!--
  An AgDR records a high-blast-radius design decision a sub-agent made
  autonomously during workflow step 9 that the triggering PRD did NOT specify.
  It is opt-in and rare — see the bar in .claude/rules/prd-authoring.md
  (§ Optional artifact: Agent Decision Records). If the PRD already specified
  the choice, you do not need an AgDR. AgDRs are frozen snapshots like ADRs;
  current behavior lives in the sibling's SYSTEM_ARTIFACT.md.
-->

---

## 1. Decision

<!--
  State what the agent chose, in one to three sentences, verb first:
  "Chose a partial index on …", "Used a two-phase backfill …". Be concrete
  about the artifact: the table, column, dependency, or algorithm.
-->

## 2. Why the PRD did not cover this

<!--
  One paragraph: what the triggering PRD left unspecified, and why the
  decision had to be made at implementation time rather than deferred back
  to a PRD revision.
-->

## 3. Alternatives Considered

<!--
  At least one alternative with why it was rejected. If there was genuinely
  no alternative, this was not a decision worth recording — drop the AgDR.
-->

### Option A — <!-- short name (chosen) -->

<!-- One paragraph. -->

### Option B — <!-- short name (rejected) -->

<!-- One paragraph, with the rejection reason. -->

## 4. Blast radius and reversal cost

<!--
  What downstream code, data, or contracts depend on this choice, and roughly
  what it would cost to undo it. This is the field that justifies recording
  the AgDR at all.
-->

## 5. Signals to Reconsider *(optional)*

<!--
  Concrete, measurable conditions that would make this choice wrong, mirroring
  an ADR's "Signals to Reconsider". Omit if none apply.
-->

| Signal | Action |
|--------|--------|
| <!-- metric or event --> | <!-- revisit, supersede via PRD --> |

---

## Related Documents

- <!-- [PRD-NNN: Title](../NNN-title.md) — the triggering PRD -->
