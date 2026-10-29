# Evidence exercises the user-visible path end to end

**Mode**: Contract

```
MODE PROPOSAL
Risk: low — rules, a template field and a decision; no script, schema or public contract changes; revertible
Uncertainty: low — the rule is written as checkable text, and the audit names the defect it targets
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-29.

## Outcome

A v2 change with user-visible behaviour cannot pass review on fakes alone. The blind audit of the post-adjustment changes on 2026-10-29 found the team page dead in a real browser: no CORS, and the preflight answered 405. All 14 tests passed, and the evidence of `web-scaffold` and of `team-stats` said, in its Not checked line, that the page was never run in a browser against a running backend. Review read that line as plausible. v1's step-9 validation, where the lead exercises the shipped behaviour, would have run it.

## Scope

In:
- **`templates/evidence-report.md`:** an `Exercised` field between `Result` and `CI`. It holds the user-visible path run end to end against the running system, as the exact command or interaction and what it showed. When the change has no user-visible path, it reads `none — <why>`.
- **`specforge/core/review.md` § What the reviewer checks:** a bullet on exercised paths. A change with user-visible behaviour, meaning a page, a CLI command, or an HTTP route another repository calls, shows that path run against the real system: a browser or a real client, not a fake. A Not checked entry on that path is a blocker, not a plausible omission. The bullet cites the audit.
- **`.claude/skills/specforge-review/SKILL.md`:** a step before the reviewer is dispatched, in which the lead runs that path and records it under `Exercised`. The lead writes it, since the loop cannot write under `.claude/`.
- **`specforge/DECISIONS.md`:** a 2026-10-29 entry giving the reason, the rejected mechanical check, and when to revisit.

Out:
- A `review_prep.py` check that requires the field. More than ten locked suites write evidence fixtures without it and assert no blocker.
- Fixing the audit's defects. That is a separate change across both siblings.

## Context

- **The audit's defect.** `../teamtasks-web/src/main.mjs:5` fetches `http://localhost:8000` cross-origin with an `Authorization` header. `../specforge-pilot/teamtasks/app.py` has no CORS middleware.
- **The Not checked lines** in `specforge/changes/archive/2026-10-27-web-scaffold/evidence.md` and `specforge/changes/archive/2026-10-27-team-stats/evidence.md`.
- **`.claude/rules/workflow.md` step 9 § Validation:** the lead exercises the shipped behaviour itself.
- **`specforge/scripts/review_prep.py` `EVIDENCE_FIELDS`:** the five fields it requires. A sixth field is ignored, so nothing breaks.
- **Suites that read files in Scope:**
  - `scripts/evidence_ci_test.py` reads the template and asserts its `- **CI**:` line;
  - `scripts/v2_adjustments_test.py` reads `DECISIONS.md`;
  - the CLI's `init-v2` and `prepublish` tests check that these files ship.

## Constraints

- The template keeps every field it has, in order. `Exercised` is added, nothing is removed.
- Every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` pass.

## Premises

- review_prep ignores an evidence field it does not list — `grep -c "EVIDENCE_FIELDS = (\"Ran\", \"Result\", \"CI\", \"Not checked\", \"Deviations from the contract\")" specforge/scripts/review_prep.py` → holds
- The template's CI line stays as evidence_ci_test asserts — `grep -c -- "- \*\*CI\*\*:" templates/evidence-report.md` → holds

## Acceptance evidence

`python3 scripts/exercise_path_test.py`, every suite in `v2-ci.yml` and `pnpm test` in `tools/cli` all pass:

1. The template has `- **Exercised**:` between `- **Result**:` and `- **CI**:`, and its comment names the `none — ` form.
2. `review.md` § What the reviewer checks has an `Exercised` bullet. It requires the path run against the real system, "not a fake", makes a Not checked entry on it a blocker, and cites `2026-10-29`.
3. The review skill has a step, before the reviewer is dispatched, in which the lead runs the user-visible path and records it under `Exercised`.
4. `DECISIONS.md` has a 2026-10-29 entry on exercising the path, with Context, Decision, Rejected and Revisit if. Its Context names the CORS defect.

## Stop and escalate

Stop and ask if a locked suite must change. Budget: 6 iterations, 2 USD, for 5 tasks (4 scenarios and the full suite).
