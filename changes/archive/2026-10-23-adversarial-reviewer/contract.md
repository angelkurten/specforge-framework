# Adversarial reviewer

**Mode**: Contract

## Outcome

Once the loop finishes, a reviewer that did not write the code looks for ways the change breaks its contract. It does not confirm the work. A script catches the cheating a pattern can see. A clean-context agent catches what only reading can: scope creep, uncovered acceptance evidence, trivial tests and unbacked claims. The result is a verdict of PASS or BLOCK, with every finding anchored to `file:line`.

## Scope

In:
- `core/review.md`: what the reviewer checks and the shape of its report.
- `scripts/review_prep.py`: mechanical checks over the diff, plus a review packet for the agent.
- The Claude Code adapter: the `specforge-reviewer` agent definition, which uses the session's model, and the `specforge-review` skill.

Out: mutation testing for Controlled mode, any CI integration, and removing v1 reviewer roles.

## Context

- `DECISIONS.md`: "One adversarial reviewer, including in Controlled mode" — same model, clean context, plus the security checklist in Controlled mode.
- `core/loop.md` § Phases, step 4 Review, and § No cheating.
- `scripts/lock_tests.py` `check`, reused for changed locked tests.
- `.claude/rules/prd-authoring.md` § 9: a test asserting an absence names the broken implementation it fails against. The v1→v2 diff keeps this rule for the reviewer.
- `.claude/agents/specforge/specforge-security-reviewer.md`: the source of the Controlled-mode security checklist.

## Constraints

- Python 3 standard library and `git` only.
- The script reports only what a pattern can decide. Judgement stays with the agent, and neither does the other's job.
- The agent definition uses `model: inherit` and has no write tools beyond Bash, which it uses read-only for git and running tests.
- Every finding carries a severity (`blocker`, `should-fix`, `nit`) and a `file:line`. A finding without an anchor is dropped.

## Acceptance evidence

`python3 scripts/review_test.py` passes. Each scenario runs against a temp git repository with a base commit and a change commit:

1. A clean change exits 0. The packet names the contract and lists the changed files.
2. A change that adds a skip marker (`@pytest.mark.skip`, `unittest.skip`, `.skip(`, `xit(`, `t.Skip(`, `@Disabled`) reports a blocker at that file and line.
3. A change that deletes a test file reports a blocker.
4. A change that removes a test function from a test file that still exists reports a blocker.
5. A change that adds a stub (`NotImplementedError`, `TODO`, `FIXME`, a `not implemented` throw) reports a should-fix at that line.
6. A change that alters a locked test reports a blocker.
7. A change with no `evidence.md`, or with one of its four fields left empty, reports a blocker.
8. Any blocker makes the script exit 1, and the packet still prints so the agent can read it.

Manual: one seeded-defect case in `tests/v2/review_cases.md`, run by the `specforge-reviewer` agent with a clean context. It must report the scope creep and the trivial test seeded there, neither of which the script can see.

`node tools/cli/dist/src/cli.js doctor` still reports 0 findings.

## Stop and escalate

Stop and ask if adding the agent definition breaks a v1 conformance test that counts roles. Budget: 3 iterations.
