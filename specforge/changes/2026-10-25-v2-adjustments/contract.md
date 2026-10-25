# v2 becomes the default, with three adjustments from the pilot

**Mode**: Contract

## Outcome

v2 is specforge's default process. The pilot decided it on 2026-10-25: v2 Contract cost 10 human minutes against 25 for v1 PRD, and let about twice as many defects escape per 1000 lines, 6.1 against 3.3. Three adjustments target where those escapes came from:

- every Contract runs an edge checklist;
- Direct ships with an edge test;
- v1's multi-role draft panel stays available, before Red, for high-risk changes that touch design.

## Scope

In:
- **`specforge/core/review.md`.** An **edge checklist** applies to every Contract and Controlled change, beside the security checklist that applies to high risk only. It covers:
  - bounds that match across every route accepting the same value;
  - normalization (strip, case, NFC) applied where a value is compared as well as where it is stored, and bounds read after it;
  - control and invisible characters refused at trust boundaries;
  - existing code that consumes a value whose domain the change widens.

  It cites the blind audit (`../specforge-pilot/specforge/changes/archive/2026-10-25-audit-fixes`).
- **`specforge/core/modes.md`.**
  - The Direct row's artifacts become "one test of an edge of the change (a bound, an empty or control-character input)". The pilot's only 🔴 came from a Direct change with none.
  - A **design panel** paragraph: for a Contract or Controlled change with high risk that touches design (schema, migration, an invariant across routes), the lead may dispatch v1's draft reviewers on the contract before Red. These are `specforge-backend-reviewer`, `specforge-security-reviewer` and `specforge-quality-reviewer`, with `REVIEW_MODE: draft` and `PRD_PATH` set to the contract. It is optional, and its findings go into the contract.
- **`.claude/skills/specforge-classify/SKILL.md`.** Step 5 says Direct creates no folder but its change lands with an edge test.
- **`specforge/DECISIONS.md`.** A dated entry: v2 is the default, with the three adjustments, the numbers behind them, what was rejected and when to revisit.

Out:
- Merging `v2` to `main`, the migration guide (task 9) and deleting v1 pieces. These are later changes.
- Any script change. These are rules for the lead and the reviewer.

## Context

- `specforge/core/review.md:17-24`: the security checklist and its trigger.
- `specforge/core/modes.md:42-47`: the mode table, with the Direct row at `:46`.
- `.claude/skills/specforge-classify/SKILL.md:13`: step 5.
- `specforge/DECISIONS.md`: append-only, newest last.
- The pilot report: the "Reporte del piloto" tab of `https://claude.ai/artifact/GtgesbKRx4aE9K6bjZFCgu`.

## Constraints

- `DECISIONS.md` keeps its shape: Context, Decision, Rejected, Revisit if.
- Every suite in `.github/workflows/v2-ci.yml` still passes, and `cli-ci`'s doctor stays clean.

## Premises

- No existing suite asserts the Direct row's artifacts or the exact text of review.md's security trigger — `grep -rn "Low risk and trivial\|adds the security checklist" scripts/*_test.py tests/` → holds: no match.

## Acceptance evidence

`python3 scripts/v2_adjustments_test.py` and every suite in `v2-ci.yml` pass:

1. `review.md` states an edge checklist for every Contract and Controlled change, with the four items (bounds across routes, normalization at compare and store, control and invisible characters, consumers of a widened value), and cites `2026-10-25-audit-fixes`.
2. The Direct row of the mode table in `modes.md` names an edge test as its artifact.
3. `modes.md` describes the optional design panel: the three reviewer roles, `REVIEW_MODE: draft`, before Red, and high-risk changes that touch design.
4. The classify skill's step 5 says a Direct change lands with an edge test.
5. `DECISIONS.md` has a 2026-10-25 entry making v2 the default. Its Decision names the three adjustments, and it has Rejected and Revisit if lines.

## Stop and escalate

Stop and ask if a scenario needs a script change. Budget: 7 iterations, 2.50 USD, for 6 tasks (5 scenarios and the full suite).
