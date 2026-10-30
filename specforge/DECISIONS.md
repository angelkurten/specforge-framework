# Decisions

Append-only log of decisions with future value. Shape: [`templates/decision-log.md`](../templates/decision-log.md). Newest last.

## 2026-10-23 — Build v2 on a separate branch, outside the v1 workflow

**Context**: v1 rules make any framework change a PRD with a reviewer panel, gate and re-review — the ceremony v2 removes.
**Decision**: v2 is built on the `v2` branch, each piece driven by a v2 change contract under `changes/`.
**Rejected**: a PRD-015 through the v1 workflow, which would spend v1's full process to replace it.
**Revisit if**: v2 is merged to `main`; from then on its own cycle governs framework changes.

## 2026-10-23 — Mode is proposed by the agent and confirmed by a human

**Context**: every change is classified on risk and uncertainty before work starts.
**Decision**: the agent proposes the mode; the human confirms or corrects it.
**Rejected**: a fully automatic classifier, and a human-only choice.
**Revisit if**: the pilot shows humans override the proposal on most changes.

## 2026-10-23 — The progress file lives with the contract

**Context**: each loop iteration starts from a clean context and needs its state on disk.
**Decision**: the progress file sits next to the contract in the change folder and is archived with it on merge.
**Rejected**: a global progress file, and state kept in the session history.
**Revisit if**: concurrent changes need to share progress.

## 2026-10-23 — One adversarial reviewer, including in Controlled mode

**Context**: v1 dispatched up to four role reviewers per round. v2 keeps review separate from implementation.
**Decision**: one reviewer, same model, clean context; independence comes from the separate context. In Controlled mode it always loads the security checklist instead of a second reviewer.
**Rejected**: the v1 role panel; a separate security reviewer in Controlled mode.
**Revisit if**: the pilot shows defects escaping Controlled-mode review.

## 2026-10-23 — Tool-agnostic core with an optional Claude Code adapter

**Context**: v1 is bound to `.claude/rules` and `.claude/agents`.
**Decision**: templates, rules and scripts form an agnostic core; hooks and skills ship as an optional Claude Code adapter.
**Rejected**: staying Claude Code–only.
**Revisit if**: the adapter grows logic the core cannot run without.

## 2026-10-23 — Brownfield adoption writes contracts only for the area being changed

**Context**: existing projects have no contracts.
**Decision**: a contract is written only for the code a change touches; nothing is specified retroactively.
**Rejected**: retroactive specs for the whole system.
**Revisit if**: never, unless a regulated project demands full traceability.

## 2026-10-23 — Remove the roadmap from v2

**Context**: `roadmap.md`, `ROADMAP.md` and eight generator/critic agents operate at product level, not change level, and the v2 brief does not use them.
**Decision**: v2 removes the rule, the template, `ROADMAP.md`, the eight agents, the three `roadmap-*` validators and the roadmap auto-update on promotion.
**Rejected**: keeping it as an optional module; keeping it unchanged outside the cycle.
**Revisit if**: a team needs product-level planning inside specforge again.

## 2026-10-23 — `SYSTEM_ARTIFACT.md` only in Controlled mode

**Context**: v2 treats code and tests as the description of reality; v1 required a living state document per sibling on every ship.
**Decision**: `SYSTEM_ARTIFACT.md` is required only in Controlled mode, for traceability.
**Rejected**: removing it entirely; replacing it with an index generated from code.
**Revisit if**: Controlled-mode teams stop reading it.

## 2026-10-23 — Contracts live in a per-change folder with no global number

**Context**: v1 numbers PRDs `NNN-` at the repo root.
**Decision**: each contract lives in `changes/<YYYY-MM-DD>-<slug>/` next to its progress file. The `prd-numbering` validator goes.
**Rejected**: global `NNN-` numbering at the root.
**Revisit if**: cross-references between changes need stable short ids.

## 2026-10-23 — Everything v2 under specforge/

**Context**: the first v2 install used unprefixed names (`core/`, `scripts/archive.py`, `changes/`, `DECISIONS.md`). The review reproduced `init --force --erase` deleting a project's own files, and `update` overwriting a project's own `scripts/archive.py`.
**Decision**: v2 lives under one `specforge/` folder: `specforge/core/`, `specforge/scripts/`, `specforge/changes/` and `specforge/DECISIONS.md`. Only the guard and the skills sit outside it, under the reserved `specforge` prefix.
**Rejected**: prefixing each name in place; making `init` and `update` collision-proof against the manifest, which would change v1 CLI semantics.
**Revisit if**: the v1 files that predate v2 (`templates/`, `examples/`, `scripts/prd-check.py`) are migrated, at which point they should move under `specforge/` too.

## 2026-10-24 — Guarantees about locked tests rest on the reviewed diff, not on hooks

**Context**: three adversarial review rounds of `specforge/changes/archive/2026-10-24-reapprove-locked-tests` showed that a PreToolUse hook cannot stop an agent that has a shell. Any command has another spelling, and the hook can be made to crash open.
**Decision**: the guarantee is that no change to an approved test or its lock reaches merge without appearing in review for a human to confirm. `review_prep.py` compares every lock between base and HEAD from git. The guard's refusals and its `ask` on `unlock` are aids, not the guarantee.
**Rejected**: claiming the hook prevents an agent from unlocking.
**Revisit if**: a host offers a write barrier an agent's shell cannot route around.

## 2026-10-24 — Accept the symlinked-lock gap until the pilot

**Context**: the final re-verification found that a `locked-tests.txt` committed as a symlink is compared as its link text, which can hide a re-approval. The fix budget and the one extra round were spent.
**Decision**: the human accepted the risk, with the reason "it will be covered in the pilot". `specforge/core/review.md` names the gap, and reviewers check for a typechange on any lock.
**Rejected**: a further fix round on this change; splitting it into a follow-up change now.
**Revisit if**: the pilot starts — cover it there, or earlier if a symlinked lock appears in any real change.

## 2026-10-24 — Close the symlinked-lock gap

**Context**: Fase 0 of the pilot fixed the gap accepted in the entry above, as the first real change run end to end by `loop.py` with `claude -p` (`specforge/changes/archive/2026-10-24-symlinked-lock`).
**Decision**: the gap is closed. `review_prep.py` blocks a lock that is not a regular file or changed type in the range, paired by canonical path; `lock_tests.py` refuses a symlinked lock in `_lines()`, which `check()` and `read_lock()` share. The accepted risk above no longer stands.
**Rejected**: keeping the reviewer's manual typechange check as the only control.
**Revisit if**: a lock reaches a reader through a path that does not go through `_lines()` or `git ls-tree`.


## 2026-10-25 — The loop budget is the change's, and loop.py is not a sandbox

**Context**: the v2 pilot overshot budgets by counting per run, and four review rounds of `2026-10-25-loop-budget` kept finding new ways an agent could alter its own ledger.
**Decision**: `loop.py` keeps a cumulative ledger (`loop-runs.txt`) and refuses a run that cannot finish. It guards the ledger against accidental damage only. Against a hostile agent, the defence is review of the diff, because an agent with `Bash(python3 *)` can edit `loop.py` itself.
**Rejected**: an open-ended hardening loop, stopped by the human after the fourth review; a CI-run check in `archive.py`, deferred because v2 has no provider-neutral CI interface.
**Revisit if**: loop agents run without diff review, or a project needs `archive.py` to verify CI itself.

## 2026-10-25 — v2 becomes the default process, with three adjustments

**Context**: the v2 pilot compared v2 Contract with v1 PRD: 10 human minutes against 25, but about twice as many defects escaped per 1000 lines, 6.1 against 3.3. The pilot's only 🔴 came from a Direct change with no edge test, and the blind audit (`2026-10-25-audit-fixes`) traced the escapes to unchecked edges.
**Decision**: v2 is the default. Three adjustments: (1) an edge checklist in `specforge/core/review.md` applies to every Contract and Controlled change; (2) Direct ships with an edge test (a bound, an empty or control-character input); (3) an optional design panel — v1's backend, security and quality draft reviewers on the contract, before Red — for high-risk changes that touch design.
**Rejected**: keeping v1 PRD as the default, at 2.5× the human time; making the design panel mandatory, which would bring back v1's cost for every change.
**Revisit if**: `escaped_2w` for the pilot (due 2026-11-08) shows the escape rate still above v1's 3.3 per 1000 lines, or the design panel is never used.

## 2026-10-25 — v2 is named specforge EVA

**Context**: v2 needed a name for the README, the changelog and the migration guide, distinct from v1's PRD workflow.
**Decision**: v2 is **specforge EVA**: Evidence (`evidence.md`), Verification (locked tests and adversarial review), Adaptation (`compose.md` turns each lesson into an artifact). The name is for prose only; paths, skills, agents and scripts keep `specforge`.
**Rejected**: renaming paths or skills, which would break every installed copy for no behavioural gain.
**Revisit if**: a release tool or package registry needs the name as an identifier.

## 2026-10-29 — v2 changes no longer maintain SYSTEM_ARTIFACT.md

**Context**: v2's core never asked for `SYSTEM_ARTIFACT.md`; the lead kept adding it to contracts out of v1 habit. In the sibling changes the loop left it unwritten twice in a row and the lead wrote it by hand, and no review found a defect through it.
**Decision**: a v2 change does not maintain `SYSTEM_ARTIFACT.md`. Current state lives in the code and its locked tests, and the why in the archived contracts (`specforge/changes/archive/`) and this log. Existing files stay as they are, since frozen PRDs cite them.
**Rejected**: removing it from v1 now. That touches hard rule 8, the gate's `system_artifact_diff` and two CLI validators (`prd-system-artifact-diff`, `gate-fence`), and belongs with retiring v1.
**Revisit if**: a newcomer cannot find their way around a sibling without a state summary, or v1 is retired.

## 2026-10-29 — Evidence exercises the user-visible path end to end

**Context**: the blind audit of the post-adjustment changes found the team page dead in a real browser: `../teamtasks-web/src/main.mjs:5` fetches `http://localhost:8000` cross-origin with an `Authorization` header, `../specforge-pilot/teamtasks/app.py` has no CORS middleware, and the preflight answered 405. All 14 tests passed on fakes, and the evidence of `web-scaffold` and `team-stats` said in Not checked that the page was never run in a browser; review read that as plausible.
**Decision**: the evidence template gains an `Exercised` field (the user-visible path run against the real system, or `none — <why>`); `review.md` makes a Not checked entry on such a path a blocker; the review skill has the lead run the path before dispatching the reviewer, as v1's step-9 validation did.
**Rejected**: a `review_prep.py` check that requires the field, because more than ten locked suites write evidence fixtures without it and assert no blocker.
**Revisit if**: a user-visible defect escapes with `Exercised` filled in, or the lead skips the step often enough that a mechanical check becomes worth the fixture churn.

## 2026-10-29 — Retire v1 from the package in 1.0.0, before `escaped_2w`

**Context**: v2 has been the default since 2026-10-25 (Contract 10 human minutes against v1's 25 in the pilot). The pilot's `escaped_2w`, which the earlier decisions waited on, is due 2026-11-08. The human chose to retire v1 now rather than wait. v1 ships 8 rules (6 load every session), 14 agents, 5 templates, 2 examples, `scripts/prd-check.py` and 12 of doctor's 17 validators.
**Decision**: remove v1 from the npm package in four changes: `update` learns to remove declared retired files; v2 foundations (a v2 `CLAUDE.md`, the general invariants v2 still relies on in a short rule, the design panel's reviewers rehomed); v1 removed from the bundle and the CLI; release 1.0.0 (MAJOR). The frozen PRDs, ADRs and AgDRs at this repository's root stay as history. Every change runs in Controlled mode, because the external kubbo installation depends on v1's `workflow.md`.
**Rejected**: deprecating now and removing in 1.0 (v1 would keep loading every session meanwhile); waiting for `escaped_2w` (the human's call); one large change (too big to review or revert as a unit).
**Revisit if**: `escaped_2w` on 2026-11-08 shows v2's escape rate still above v1's. That is a reason to strengthen v2's review, not to reinstate v1 as it was.

## 2026-10-29 — `update` removes only files the framework declares retired

**Context**: an untouched file that leaves the bundle stays on the adopter's disk, untracked and unchecked. A first draft removed every such file. It broke the test that pins installs from before 0.10: those tracked `CHANGELOG.md`, `VERSION`, `mkdocs.yml` and `.github/workflows/cli-release.yml` as framework files, and an adopter may own those paths now.
**Decision**: `partition.ts` `RETIRED_FILES` lists the globs the framework retires. `update` removes a file only when it is untracked by the new bundle, matches that list, is not team data, and is byte-equal to its recorded install sha. An edited file is kept and reported under any strategy.
**Rejected**: removing every untouched dropped file; a `RETIRED` file shipped in the bundle (more mechanism; tests inject the list as an option instead, as `runPrepublish` does with `bundleOnly`).
**Revisit if**: an adopter needs a declared retired file back. Pin the previous version, or copy the file in as team-owned.

## 2026-10-29 — The design panel becomes the reviewer's design mode

**Context**: the optional pre-Red design review of a high-risk contract dispatched v1's backend, security and quality reviewer agents. Retiring v1 from the package removes all 14 v1 agents, so the panel needs a home that survives.
**Decision**: `specforge-reviewer` gains `Mode: design` with a `Perspective` (backend, security, quality); `review.md` § Design mode defines what each reads and checks, and `modes.md` § Design panel dispatches it once per perspective. The plan to retire v1 is revised from four changes to five changes: 1 `update` removes declared retired files; 2 this design mode; 3 the file swap (a v2 `CLAUDE.md`, a short unscoped rule, v1 files out of the repo and the bundle); 4 v1 validators out of `doctor`; 5 release 1.0.0.
**Rejected**: a separate design report format (the report follows § Report); keeping three v1 agents only for the panel.
**Revisit if**: the design mode's findings are routinely ignored before Red, or a perspective needs a report shape § Report cannot carry.

## 2026-10-29 — The design mode is required before Red in Controlled mode

**Context**: the first real dispatch of `specforge-reviewer` in its design mode (backend perspective) ran against the shipped contract of change `2026-10-29-update-removes-retired`, a Controlled change that had skipped the optional panel. It found a blocker that the post-code review and two re-verifications had missed: an `update` that exits 10 after refreshing files leaves a manifest that makes the next run halt on drift.
**Decision**: in Controlled mode the lead dispatches the design mode before Red, once per perspective (backend, security, quality), and puts the findings into the contract. It stays optional for a high-risk Contract change.
**Rejected**: keeping it optional everywhere, since the one Controlled change that skipped it shipped a blocker; making it required for every high-risk Contract change too, which would bring back v1's draft-panel cost on most changes.
**Revisit if**: three Controlled changes in a row get no blocker or should-fix from it.

## 2026-10-29 — `update`'s retired-file removal is safe to fail and to restart

**Context**: the design mode's backend run on change `2026-10-29-update-removes-retired` found that a read error on a retired file landed after the refresh had written files, so the next `update` halted on drift. Further design rounds found aliases (hard link, case-only or normalization alias), symlinked parents, FIFOs and manifest paths that leave the repository.
**Decision**: four choices. (1) Recovery of a retired file is `git restore`, `git checkout <commit> -- <path>` or the previous package, documented in `docs/migration-v1-to-v2.md`; `init --force` is not a recovery. (2) No git-tree guard on `update`'s removal: the removed bytes equal the install bytes, which are in the package and in git. (3) `RETIRED_FILES` is append-only across releases. (4) One accepted gap: an edit saved, or an ancestor swapped for a link, between the last re-check and the unlink; the re-check narrows the window but cannot close it, since the check is path-based.
**Rejected**: `init --force` as recovery (downgrades the install); a git guard (more mechanism for bytes that are already recoverable).
**Revisit if**: an adopter loses an edit to the accepted gap.
