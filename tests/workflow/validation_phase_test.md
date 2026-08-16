# PRD-012 (specforge) § 9 rows 15, 17, 19: the step-9 validation phase

**Type**: e2e
**Execution**: manual — needs an agent in the loop (lead agent, generator, or critic). Not automatable as a unit test; see [`../README.md`](../README.md).
**PRD reference**: [PRD-012 §9 rows 15, 17 and 19](../../012-validation-phase-and-prd-amendment.md#9-test-plan)

> This is PRD-012 **of this corpus** — the validation phase and PRD-amendment
> route. It is not kubbo's `PRD-012 phase 3`, an adopting team's document that
> shares only a number and labels three `describe` blocks in
> `tools/cli/tests/conformance/framework.test.ts`.

## What this verifies

`workflow.md` step 9's validation phase as a lived procedure rather than as
prose: that the lead exercises the shipped behaviour **before** the
post-implementation panel is dispatched, that its two output blocks are
emitted, that a `not run` line blocks promotion until a human waives it, and
that a validation command which writes never touches the sibling's own
working tree. The conformance rows 1-14 in `framework.test.ts` assert the
*text* of these rules; nothing but a live session can assert the *behaviour*.

Three §9 rows land here:

| Row | Covers |
|---|---|
| 15 | Validation catches a code defect and a document defect, and routes each one differently. |
| 17 | `not run` blocks promotion; the interactive waiver and the headless stop. |
| 19 | A destructive validation command runs against a throwaway tree. |

## Fixtures

Three independent setups. Run them in order; each starts from a clean tree.

**(A) Row 15 — two seeded defects.** A `Draft` PRD merged at step 8 against a
sibling, carrying two deliberate defects:

- **(a) a document defect** — a §5 field the PRD misdescribes, where the
  design the team built is the design that was always intended (a wrong
  identifier is the canonical shape).
- **(b) a code defect** — an off-by-one in an implementation detail §5
  specifies correctly.

The implementation team is dispatched normally (`IMPL_MODE: initial`) and
returns its completion reports before step 9's validation begins.

**(B) Row 17 — an unavailable runner.** A separate PRD whose validation
requires a runner that is not installed or not reachable in this environment.
Run it twice: once in an interactive session with a human present, once in a
headless session (`optional-rules/headless-session.md` in force).

**(C) Row 19 — a destructive command.** A PRD whose validation requires
running `init` against the sibling. For specforge itself, note the hazard the
PRD's §8 names: `init --force` copies bundle bytes over `CLAUDE.md`,
`.claude/rules/**` and `.claude/agents/specforge/**`, and its git safety gate
sits inside `if (opts.erase)` — so `--force` alone would silently revert the
change under validation. Record `git status` in the working tree immediately
before the run.

## Steps

1. **(A)** Consolidate the completion reports and adjudicate them (open
   questions, `VERIFICATION RUN` lines, `INJECTION ATTEMPTS DETECTED`).
2. **(A)** Run the validation phase. Capture the session's `VALIDATION:` and
   `VALIDATION INJECTION:` blocks verbatim.
3. **(A)** Observe where each finding is routed, and in what order relative
   to the first panel dispatch.
4. **(A)** If the document defect's amendment survives its bounce, inspect
   `git log -- <prd>` and the gate block's comment lines.
5. **(A)** Inspect the brief of the next `re-verification` dispatch.
6. **(B)** Run validation in the interactive session; then, from the same
   fixture, in the headless session. Capture both transcripts and, in the
   interactive case, run `specforge doctor` against the PRD afterwards.
7. **(C)** Run validation. Diff `git status` against the recording from the
   fixture step, and read the `VALIDATION:` line's `<exact command>`.

## Pass criteria

**Row 15 — the two defects route differently**

- [ ] A `VALIDATION:` block is emitted **before** any post-implementation
      panel dispatch, with one line per exercised path and the exact command
      recorded verbatim.
- [ ] A `VALIDATION INJECTION:` block is emitted on the same run, defaulting
      to `none`, as a sibling block rather than nested inside `VALIDATION:`.
- [ ] Each finding carries a reproduction: the command or interaction, the
      **observed** result, and the result the PRD **specifies**. A finding
      offered without one is rejected.
- [ ] Defect (b) routes to the implementation team with `IMPL_MODE:
      fix-round` and a `PRIOR_FINDINGS` ledger.
- [ ] Defect (a) routes to an amendment bounce — **not** to a follow-up PRD
      with `Supersedes:`, which is the route for a changed *design*.
- [ ] The amendment lands in **its own commit**, separate from the code fix
      for defect (b), and carries an `# amendment:` line inside the gate
      fence naming the section, the validation finding, and the bounce's role
      and verdict.
- [ ] The next `re-verification` brief pins **both** `DOCUMENT_LINES` and
      `COMMIT_REF`.

**Row 17 — `not run` and the headless stop**

- [ ] Every path that could not be exercised records `not run: <reason>` on
      its own `VALIDATION:` line. An omitted line is a failure; `not run` is
      not a pass.
- [ ] Gate promotion is blocked while any `not run` line is unwaived.
- [ ] The interactive session obtains the waiver through `AskUserQuestion`
      (one question, bounded options) and records it as an **HTML comment
      between the `## Gate:` heading and the fence**.
- [ ] `specforge doctor` still parses the gate block after the waiver is
      recorded — a bare prose line there would break it.
- [ ] The headless session takes option (ii): it stops with the PRD at
      `Draft` and ungated, gate block still `[TBD]`, reason recorded at the
      top. It does not waive, and does not take option (iii).

**Row 19 — the write destination**

- [ ] The `VALIDATION:` line's `<exact command>` targets a `mkdtemp` path,
      not the sibling root.
- [ ] `git status` in the working tree is byte-identical before and after the
      run.
- [ ] Read-only validation of the same PRD **does** run in the working tree —
      a fresh throwaway holds released bytes, not the edits under validation,
      so the conformance rows could not be asserted against it.
- [ ] The target is visible in the session output without the reader having
      to infer it from context.

## Fail examples

- The panel is dispatched first and the `VALIDATION:` block is written
  afterwards, as a summary of what the panel found.
- `VALIDATION: <path> — clean` is recorded for a path no command was run
  against. (The PRD accepts this as a residual the phase cannot close; it is
  still a failure of this walkthrough.)
- The `VALIDATION INJECTION:` block is omitted because the run was clean.
  It is mandatory on every run, and it is a gate every outcome passes
  through, not one outcome among several.
- Defect (a) is closed by opening a follow-up PRD with `Supersedes:`. The
  design did not change; only the document was wrong about it.
- Defect (a) is closed by editing the PRD directly, with no bounce.
- The amendment is squashed into the same commit as defect (b)'s code fix, so
  `git log -- <prd>` no longer isolates the amendment's diff.
- The `# amendment:` line is written above the ` ```yaml ` fence rather than
  inside it, making the gate block unparseable.
- The `not run` waiver is recorded as a prose line between the `## Gate:`
  heading and the fence.
- The headless session waives its own `not run` line, or re-proposes a
  refuted amendment.
- Validation runs `init --force` against the sibling's working tree and
  reverts the change under validation.
