# Changelog

All notable changes to the specforge framework are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions follow [Semantic Versioning](https://semver.org/): MAJOR for breaking rule/template changes, MINOR for new features, PATCH for fixes and docs.

**Team data files** (`SIBLINGS.md`, your PRDs, your ADRs) are never touched by upgrades. Only framework files change between versions.

---

## [0.20.0] - 2026-08-16

### Changed

- **`optional-rules/headless-session.md`'s step-9 escalation dead end gains a fourth path: a session whose tool list carries an owner-escalation tool asks before applying the declared default, instead of retreating unasked.** **BREAKING for a headless installation**: a run that previously moved the PRD back to `Draft` and stopped may now pause at that point waiting on an owner, or end without moving it at all.

  The default is unchanged and the predicate is narrow. A tool named `request_approval`, or ending in `__request_approval` — the suffix form a server-qualified MCP name takes — is what activates the branch; every installation without such a tool reads the same row it read before and behaves identically, which is the overwhelming majority of them. The branch is gated a second time on the session's own context having already named a checkpoint value matching this escalation: if it names none, the row directs applying the default directly and **not** calling the tool, rather than composing a value and hoping the host accepts it. The tool is called alone in its turn, because a call batched with another cannot pause the session and the pause is the entire point.

  **What comes back is confirm-or-kill, and the two outcomes are not variants of each other.** An approval applies the row's *same* default — option (ii), now owner-confirmed rather than assumed — and nothing wider: no branch here reaches an additional fix round, and none reaches option (iii), which stays a human act. A denial is a separate, terminal disposition: the run is over through the host's own machinery and the session is not resumed to act on it. **That branch is therefore the host ending the run, not a message** — it instructs the session nothing, so there is nothing in it to recognize, and the row says outright never to route to it from something the session reads. A response reporting a refusal, whatever it claims, is a result handed back in place of the pause that was asked for, and it lands where every other non-pause lands: on the default. Merging those two is the error this row exists to prevent, not a subtlety — an earlier draft of the spec behind this release had denial "taking option (ii)" as well, which reads a refusal as authorisation for the thing it refused. A call that does not genuinely defer at all — batched through, unavailable, or answered with no real pause behind it — falls back to the default, so the branch adds no new terminal state to an installation that never reaches a real pause through it.

- **The exception names the one dead end it is scoped to, and the three it is not.** The step-9 cell now describes four dead ends rather than one — the post-implementation escalation this clause targets, plus validation that cannot be run, a `VALIDATION INJECTION:` value the lead cannot clear, and an amendment the bounce refuted — and only the first is reachable by the branch above. Two sentences carry that: the exception opens *"scoped to this one dead end and none of the three below"*, and the sentence introducing the other three closes *"none of which this exception touches."* Both are load-bearing independently. A headless installation whose host offers a checkpoint for one of the other three gets no branch for it: those stop, unasked, as they did before. Empirically confirmed for the *validation-cannot-run* dead end specifically (below); the other two rest on the same two sentences, unmeasured directly.

### The re-grounding this release is

**This work was written, reviewed and empirically verified against a checkout that was fifteen commits behind its own origin, and this entry is its second landing.** The clause cleared three post-implementation review rounds and two adversarial bounces as a "0.18.0" that never existed upstream. Both 0.18.0 and 0.19.0 had already been published from work this checkout could not see — and one of them, specforge-framework's own PRD-012, rewrote the exact cell this clause inserts into, turning a single step-9 dead end into the four enumerated above.

The re-integration is therefore a move, not a redesign. **The clause's decision logic is unchanged from the text that was already verified**: the same tool-name predicate, the same catalog precondition, the same call-alone instruction, the same confirm-or-kill split, and the same deny-branch routing rule that closed the in-band-refusal gap. What moved is where it sits — after the restructured cell's opening sentence, before its enumeration of the other three — and what was added is the two scoping sentences above, which the one-dead-end cell had no need of and the four-dead-end cell does. The conformance rows moved with it into the same describe block, plus one new row pinning the two scoping sentences separately, so a rewrite that drops either one fails rather than silently re-opening the ambiguity.

**The prior round's twenty-one runs are not restated here as evidence for this file.** They measured the clause's decision logic, which is what survived the move intact; they did not measure it in this insertion context, because this context did not exist when they ran. What follows is a smaller confirmatory sweep that does, sized as a re-integration check rather than fresh mechanism discovery.

Twelve runs, opus, CLI 2.1.233, `--strict-mcp-config` so the session's tool list stayed a controlled variable, each cell installed through `init --headless` from the bundle built out of this working tree, so every run read the cell exactly as it ships. Under the restructured cell, at the escalation dead end the exception does reach: **tool absent, matching checkpoint named** — no call, option (ii) applied (0/2 called); **tool present with a matching checkpoint named** — the session proposes that catalog member and applies option (ii), naming the owner-confirmed branch (2/2 called, 2/2 applied); **the same cell with the tool answering in a refusal's shape** — it calls, reads the result as a non-pause rather than as the deny branch, and still applies option (ii), citing the routing rule (2/2 called, 2/2 applied, and neither claimed an owner had approved anything). The call-alone property was checked against the session transcripts rather than the sessions' own accounts of themselves: in all four calling runs the `tool_use` block was the only one in its assistant turn.

**The six runs the restructure made necessary are at a dead end the exception must not reach**, and they are what this sweep exists for: step 9 arrived at through *validation that cannot be run* instead, tool present in all six. Three paired it with a host catalog naming a validation-waiver checkpoint, three with a catalog naming the escalation checkpoint the exception's own precondition asks for. **0/6 called the tool.** All six stopped at the same option (ii), and all six named the scoping clause as the reason rather than arriving there by accident — five quoting *"scoped to this one dead end and none of the three below"* verbatim and identifying this as one of the three. All twelve runs left `Status: Draft` and the gate block's `[TBD]` placeholders intact.

**Three of the six do isolate the scoping sentences from the catalog precondition, not merely reinforce it.** The other three (validation-waiver checkpoint named) fail both guards at once and prove less on their own. But the three that name the escalation checkpoint specifically satisfy the catalog precondition — that value genuinely matches "this escalation" — while the session sits at a dead end the scoping sentences exclude. Those three stop on scoping alone, with the catalog guard already cleared, which is what a maximally-tempting setup looks like and is exactly what was measured. What remains unmeasured is the negative control — the same six cells run again with the scoping sentences removed from the cell — which no shipped cell can run against itself.

**One limitation bounds all twelve, and it is the same one that bounded the twenty-one.** The tool answered synchronously and in-band in every run; none of the cells wired up the hook a real pause needs, so `stop_reason` read `end_turn` throughout and no run reached a genuine deferral (`stop_reason: tool_deferred`) or a resume. These runs verify the row's decision logic in its new surroundings — the predicate, the catalog precondition, whether the call is made alone, what a session does with whatever comes back, and whether the scoping holds — and **not** deferral behaviour itself, which belongs to the host that wires the tool up. One further honest count: the owner-confirmation reached the note written on the PRD in one of the two approve runs, the other recording the retreat without naming the owner. That matches the prior round's proportion and is still not something to rely on in the artifact itself.

## [0.19.0] - 2026-08-16

### Added

- **`prd-authoring.md` prescribes the propagation table's shape**, beside the §9 Test Plan shape it already prescribed. A propagation table is a PRD's work list — one row per file and site a change must touch. PRD-010 invented the form and PRD-012 copied it, both anchoring rows with a `Line` column of absolute line numbers under the heading "This table is exhaustive". Neither property held.

  Rows now anchor by a **greppable span** — verbatim source text carrying no line break, no emphasis marker, no quote character, no backtick and no pipe — confirmed unique with `grep -o -F '<span>' <file> | wc -l` returning exactly `1`. Or by a named structural unit (`rule 7`, `step 9`, a heading title). Or by the literal `new`. Never a line number.

  Each of those four defeaters was hit by a draft of the PRD that introduced them, which is why they are enumerated rather than left to judgement. So was the counting rule: `grep -c` counts *lines containing a match*, so a span occurring twice on one line reads as unique, and an earlier draft published exactly such a span as its worked example of a successful repair.

- **The table is a work list, not a completeness claim, and may not say otherwise.** Completeness is established by the diff-reconcile `workflow.md` step 9 already performs — mechanically, after the fact, against `git diff --name-only`, on evidence the author did not have. The hand-written table adds only the prediction, and the prediction is what fails.

### Changed

- **PRD-012 §6.2 is corrected in place** — the first use at scale of hard rule 7's clause permitting an edit to an `Implemented` PRD to correct a factual error, routed by `prd-authoring.md`'s decision table to `Edit in place`. Removed: the exhaustive claim, the clause vouching for its line numbers, and the `Line` column from the header and every data row. Corrected: §6's opening count, §10's edit list and the `Impacted Projects` cell, all of which under-counted the files that PRD amends.

  `Status`, the gate fence, `commit_hash`, the `tests:` list, `system_artifact_diff` and the `# yellow-tracking:` comment are byte-identical to their state at that PRD's own promotion. The security panel verified it across two rounds, the second time by executing mutations in a detached worktree rather than reading the diff — and found the boundary jointly guarded, with the conformance suite pinning the gate's values and `doctor` pinning its structure.

### Notes for adopters

- **Nothing errors on upgrade.** There is no validator; an existing `Line`-column table is unaffected until you choose to convert it, and converting is mechanical — the `Current` column usually already holds the span the `Site` column needs, minus its emphasis and backticks.
- **`docs/` is not bundled**, so the `mental-model.md` mirror of the decision-table clause reaches you only through the repository.
- **Two findings are tracked in PRD-014 (`Draft`), not fixed here**: the in-place correction route states no boundary on its own reach — `Do not bump status` constrains one field while the gate block is unconstrained by anything but convention — and a lead edit to a frozen PRD has no mandatory review surface, since no validator holds a baseline for a PRD's prior content and the reviewer definitions oblige no record-integrity read.

### The finding the release did not plan

The measurement behind this change: `file:line` citations across the corpus resolve at 70.6% — 40% rot once same-day citations are excluded — and churn in the target file predicts it rather than age. Citations into frozen PRDs resolve at 100%; into the conformance suite, at 19%.

The PRD written to fix that then failed the same class a dozen times across four drafts and five review rounds, with the author's whole attention on that failure mode: omitted sites, an invented quote, spans defeated by wrapping and by emphasis and by a backtick, and restated counts going stale between one section and another. One round swept four restatements of a single count and missed a fifth two lines below one it had swept. Another introduced a fresh miscount into the correction note itself, which all three reviewers then caught independently, each by a different arithmetic.

So that measurement describes citations rotting **over months, as the tree moves**. This release's own history describes something sharper: restated facts going stale **inside single editing sessions, under active review**. The conclusion written into the PRD is that a document's defect density scales with the number of facts it restates, and care does not close that gap. The scope cut that followed — dropping a `doctor` validator and the assertions that checked the PRD's own table against itself — is that conclusion applied rather than a retreat from it. The last two blockers in the corpus were both defects in those self-checks, not in the convention they were checking.

## [0.18.0] - 2026-08-16

### Added

- **`workflow.md` step 9 gains a validation phase: the lead exercises the shipped behaviour before the post-implementation panel is dispatched.** Nothing in the nine steps ever ran the software. The implementers' `VERIFICATION RUN` is a closed list of non-interactive runners — test suite, linter, type checker, migration up/down — and the four reviewers read the diff, so a defect visible only to someone using the thing reached the gate unseen. A grep for `staging`, `dev environment`, `smoke`, `exploratory` and `manual test` across the rules, the definitions and the templates returned nothing before this release; the single occurrence of "acceptance" forbade the section.

  The phase existed anyway, outside the framework. Two workflow defects in the 0.15.x entries below are recorded as *"found during PRD-012 phase 3's post-gate verification"* — an activity `workflow.md` did not define, running *after* the gate rather than before it. It now runs before, emits two mandatory blocks (`VALIDATION:` and `VALIDATION INJECTION:`), and its findings carry the panel's severity scheme. A validation finding without a **reproduction** — the command, the observed result, and the result the PRD specifies — is rejected the same way a reviewer finding without a `file:line` anchor is.

  This was not theoretical on its own release. The phase found a defect in the text that shipped it: step 9's `not run` bullet said *"takes option (ii) below"* when two enumerations downstream each have a `(ii)`, and the nearer one is the wrong one — a headless session would have routed a finding to code instead of stopping. Nineteen conformance rows, a green suite and a clean `doctor` did not see it; reading the shipped text as instructions did.

- **A route for what that phase finds in the spec rather than the code.** When validation shows the design the team built is the design that was always intended and the PRD's *text* is what fails to describe it, the lead amends the PRD in place through an adversarial bounce — one reviewer whose target is pinned by the amended section, carrying the full prior-findings ledger, with a refutation fatal however it is filed. A surviving amendment lands in its own commit and is recorded as an `# amendment:` line inside the gate fence. Previously the only routes were a follow-up PRD, a `SYSTEM_ARTIFACT.md` note, or the no-op below.

  **The route refused both proposals made to it, on its own PRD.** The first added a sentence telling an implementer to widen scope, which lands as a live directive on the one role holding `Edit`/`Write`/`Bash` and contradicts its own definition's *"report it, don't silently fix it."* The second cited six `workflow.md` lines past the end of that file, because they were post-change numbers in a table whose convention is pre-change. Both are recorded; neither entered the document. **Refusing is the mechanism working, not failing.**

### Changed

- **The freeze point is stated once, in hard rule 7, and it is `Implemented`.** **BREAKING**: a `Draft` PRD past step 8 is now amendable by the lead through the bounce above. It was never frozen by rule 7's own words — *"the rule applies to the `Implemented` state, not to the file"* — but `workflow.md`, six subagent definitions, six README diagram labels and five `docs/` pages carried the opposite reading, all introduced by a single unreviewed commit in April 2026 that added both halves at once. `workflow.md` now contains the word "frozen" zero times.

  A team with a PRD mid-flight at step 9 when this lands gains the amendment route and a relaxed moving-target rule. Nothing in flight breaks — pinning both brief fields is legal under the new rule and pinning one still is — but a session that read the old text and a reviewer running the new definition will disagree about whether *"never both"* holds. Finish an in-flight step 9 before updating, or re-read step 7 after.

- **`gate-block.md`'s `commit_hash` no longer demands a merge commit.** It demanded one while `CONVENTIONS.md` permitted any commit, and **all seven populated values in the corpus are single-parent commits** — four of them pointing at a fix round rather than a ship. A rule violated by 100% of its own corpus is not a rule.

- **The `untrusted-evidence` fence binds outside the roadmap cycle.** Its scope clause covered "all 8 roadmap briefings and any future generator/critic briefing", which excluded the one new untrusted-input channel this release opens. It now reaches any briefing or outbound channel carrying verbatim third-party or running-system output — additively, so the 8 briefings keep their unconditional obligation over user-supplied fields.

### Fixed

- **Step 9's escalation option (ii) was a no-op.** It moved the PRD *"back to `Draft`"* and stripped gate fields — but step 8 merged it at `Draft` with a `[TBD]` gate block, and promotion happens only after the loop option (ii) escapes from. `hard-rules.md` called it *"the single escape hatch"*; `optional-rules/headless-session.md` made it the only step-9 escalation a headless session may take. It now means what it always tried to: stop, leave the PRD `Draft` and ungated, record why at the top.

- **Steps 7 and 9 stated incompatible moving-target rules** once an amendment can move the PRD between rounds. Both now pin every target that moved, and the four reviewers' report contract opens with every pinned value rather than "that value", singular.

- **A headless session had no route for a non-`none` `VALIDATION INJECTION:`.** The gate requires adjudication *with a user*; the headless row enumerated a closed set of two dead ends that excluded it, and the file's own "decide it yourself and record it" pattern yielded the exact resolution the gate exists to prevent — the lead adjudicating its own report.

### Notes for adopters

- **`docs/` is not bundled.** The FAQ, overview, quickstart, index and mental-model corrections reach you only through the repository, not through `update`.
- **None of the new controls is host-enforced.** The write-destination rule, the fence obligation and the injection gate are advisory rule text, audited through the mandatory `<exact command>` record rather than blocked. An earlier draft used a `permissions.deny` entry instead and it was withdrawn on evidence: a prefix deny closes one command spelling per pattern, and `.claude/settings.json` is outside the partition so `update` never touches it — every adopter would have had to hand-append it.
- **One 🟡 is tracked in PRD-013 (`Draft`)**, not fixed here: PRD-012 §6.2's propagation table claims an exhaustiveness it drifted from four times. The shipped code is correct and all three post-implementation reviewers verified so; the document is what drifted.

## [0.17.0] - 2026-08-15

### Changed

- **`optional-rules/headless-session.md` routes by `prd-authoring.md`'s decision table, No-PRD rows included, instead of claiming every request gets the nine steps.** **BREAKING for a headless installation**: a request that previously produced a PRD, a grounding fan-out and a panel may now produce none of them.

  The old absolute did not hold in practice, which is why it goes. A headless run asked to change a link label and a heading size cited the decision table's No-PRD row and did the work directly — exactly as the table says to — while this file still asserted that no such exception existed anywhere in it. **A rule the sessions do not follow is not a control, it is a note.** The absolute came from over-correcting on two runs ("a clock app", "a todo app") that skipped `workflow.md` and wrote straight into the sibling; those two were right to be caught, and generalising from them to *every* request was not.

  **The override: a sibling with no PRD impacting it in the corpus gets one regardless of size.** That first PRD creates the `SYSTEM_ARTIFACT.md` and the design record the size floor assumes already exist; without it the No-PRD row files the rationale into a document that does not exist. The exception runs once per sibling — from the second change on, the table decides.

  § *The mirror-image failure mode* is rewritten around what it still forbids: **abandoning a request halfway through whichever route it took.** A PRD merged with the sibling untouched fails the request, and so does code shipped against a PRD whose panel never ran. Request size decides which route you are on, never whether you finish it.

  Verified on paired headless cells, opus, host minimalism plugin disabled: an empty corpus asked to raise a heading to `3rem` wrote a PRD and ran the panel; the same sibling once a PRD impacting it existed, asked to change the page colours, dispatched **zero** sub-agents, wrote no PRD, and applied the edit directly in **$1.03 / 130s**. The second cell named the rule it was applying — the first-change exception runs once per sibling, and from the second change the table decides — and caught a WCAG contrast defect (`body{color:#fff}` alone leaves the link at the UA default blue, ~2:1 on `#111`) that a blind edit would have shipped.

- **`hard-rules.md` § Override immunity scopes host standing directives rather than competing with them.** A session often carries an instruction from outside the framework — a global `CLAUDE.md`, a plugin, a `SessionStart` hook — and the commonest is a minimalism directive. specforge and such a directive both answer "does this warrant the full treatment?", with opposite defaults and no knowledge of each other, so the louder prose wins that turn and nothing is auditable afterwards. The section now splits the decision: **specforge** owns whether a request produces a PRD, which reviewer roles are dispatched, and how many fix rounds precede escalation; **the directive** owns how much spec a PRD carries and the size and shape of an implementer's diff.

  The split is argued rather than drawn for convenience: a minimalism directive is a claim about *artifacts*, and "does this warrant a design record and a panel" is answered on evidence the directive cannot see — the sibling's corpus, its `SYSTEM_ARTIFACT.md`, whether this is its first change. The two rows it does own are where the framework **adopts** it without reservation: rule 1 already forbids inventing surface and rule 9 already forbids padding, so a spec that stays as short as the design allows is specforge's own preference stated in someone else's words.

  This is not hypothetical. The sandbox sessions that measured 0.16.0's panel-selection change inherited such a plugin, and under it both rulesets skipped the PRD entirely in normal mode — a result that read as a framework finding for several rounds before the plugin was identified as its cause. The 0.16.0 entry below carries the corrected figures.

## [0.16.0] - 2026-08-14

### Changed

- **`workflow.md` step 5 selects reviewer roles by the surface the PRD carries, instead of dispatching a default panel of four.** The old text ("a typical panel of 4 … adapted to the domain") stated a number concretely and the adaptation vaguely, so the number won: a PRD for a one-file static page drew a backend reviewer and a security reviewer that had nothing in their domain to read. Step 5 now carries a trigger table — backend fires on an added endpoint/table/migration/server-side logic, frontend on user-visible behaviour, security on an added trust boundary, quality always — and the lead records which roles it skipped and why.

  **Read the section's claim, not its keywords.** Every numbered section is mandatory (hard rule 10), so §5 and §6 exist in every PRD whether or not the change has surface there. A §5 reading "this change adds no API" still contains the word `API`, still writes `GET /index.html` while explaining that a static host resolves it, still names `localStorage` while ruling it out. This was measured, not assumed: a first cut of the table guarded only the §8/security row, and in a headless run the backend reviewer fired anyway against a §5 that asserts "adds no API". Generalising the guard to every row dropped the panel to two on a PRD whose §5 and §6 were *more* keyword-dense than the one that had fired it.

- **`optional-rules/headless-session.md` step 5 follows that trigger table rather than fixing the panel at four.** **This breaks the contract kubbo's PRD-012 § 5.6 assumed**, and the conformance row that pinned the word `four` changed with it — a headless installation that depends on a fixed-width panel must re-pin it locally. The reasoning the file already uses is what permits this: it withholds *judgement* from a session with no user, not *rules*, and "does § 5 name an endpoint?" is read off the document rather than weighed. `specforge-quality-reviewer` fires unconditionally, so the panel is never empty.

  **The triage gate below does not fire headless.** That dial stays welded shut deliberately: § *The mirror-image failure mode* exists because real headless runs skipped `workflow.md` entirely and wrote code with no PRD behind it, and a request-shape judgement is exactly what those runs got wrong.

- **`workflow.md` step 1 triages before the step-2 fan-out.** A request landing on a **No PRD** row of `prd-authoring.md`'s decision table is done directly, with no grounding agents and no panel — the flow's cost is justified by the artifact it produces. **The size floor does not apply to a sibling's first change**: a project with no PRD in the corpus yet gets one regardless of size, because the No-PRD row would otherwise route the rationale into a `SYSTEM_ARTIFACT.md` that does not exist yet.

- **`workflow.md` step 9 re-runs role selection against the diff, not the PRD.** Shipped code carries surface a spec did not promise, so the post-implementation panel may legitimately be a superset of the roles step 5 selected.

Measured on paired headless runs of the same request ("an `index.html` with a name and a link"), same model, same sandbox, rules the only variable: the draft panel went from 4 roles to 2, the post-implementation panel from 4 to 2, step-6 adversarial bounces from 3 to 1, and re-verification from 3 dispatches to 1. The patched run completed the whole cycle — PRD, review, fixes, implementation, tests, `SYSTEM_ARTIFACT.md`, post-implementation panel — in 8 sub-agent dispatches; the baseline was at 11 and still in the draft loop with no code written.

**In an interactive (non-headless) session this change is a no-op, and that is the honest scope of it.** A paired normal-mode run on a PRD-worthy request selected the same three roles — frontend, security, quality, backend correctly omitted — under both the old text and the new table. The old "adapted to the domain" wording already adapted when a user was present to adapt for; what it could not override was `headless-session.md` pinning the width at four. **The waste this release removes lived on the headless path only.**

Verification note: the sandbox sessions inherited a user-level plugin that instructs the model to skip work it judges unnecessary, and under it both rulesets skipped the PRD entirely in normal mode — an artifact, not a framework behaviour. The normal-mode figures above come from re-runs with that plugin disabled. The headless figures were not re-run, because the plugin was active in both arms of that pair and a bias constant across arms does not explain a difference between them; the absolute dispatch counts there may still be depressed relative to a clean headless installation.

### Fixed

- **`npm pack` shipped stale build artifacts, so the published tarball's `--headless` flag did not work.** Neither `dist/` nor `framework/` is tracked in git, and `npm pack` runs `prepack` — which did not exist — rather than `prepublishOnly`. The packed CLI predated the `--headless` flag entirely (zero occurrences of `headless` in `dist/src/cli.js`) and the bundle was missing `optional-rules/headless-session.md`, so `init --headless` exited 10 on a missing bundle file. `prepack` now runs `build && prepublish`, which is idempotent — `prepublish` syncs the version from the `VERSION` file rather than incrementing it — so a hand-run `npm pack` produces what `npm publish` would.

- **The committed `npm-shrinkwrap.json` still declared `0.14.1` while `package.json` declared `0.15.4`.** `prepublish.ts`'s own comment names this failure: "`npm ci` refuses a tree whose two disagree." Wiring `prepack` surfaced and corrected it.

- **Two e2e files each ran their own `npm pack`, racing on the shared build tree.** With `prepack` refreshing `framework/` via a recursive delete, two parallel packs produced intermittently partial tarballs. A vitest `globalSetup` now packs once per run and both files consume that artifact — which also removes a duplicated full build.

## [0.15.4] - 2026-08-14

### Fixed

- **`optional-rules/headless-session.md`'s step-8 reinforcement (0.15.3) fixed the wrong half by itself.** Verified against a real headless run ("a clock app"): the session implemented working code and skipped `workflow.md` entirely to get there — no grounding, no PRD, no panel. A new section states the file's whole point is "do both steps 1-9 and step 9's code, always, in order," not "prefer code over a PRD" — there is no request-shape exception that lets a session judge a request too small for the nine steps. Found during PRD-012 phase 3's post-gate verification, the same run that confirmed 0.15.3's fix.

## [0.15.3] - 2026-08-14

### Fixed

- **`optional-rules/headless-session.md`'s step-8 default ("proceed to step 9 with the merged PRD") did not reliably fire.** A real headless run given a plain request with no hint that a workflow exists to follow ("a todo app") produced a grounded, panel-reviewed PRD, merged it, and ended — `../app` was never opened, holding only its `auto_init` README when the session finished. The row is now explicit that step 8 is not a resting point ("in the same turn, without ending the session first"), and a new section names the failure mode directly: reaching step 8 is the middle of the request, not the end of it. Found and fixed during PRD-012 phase 3's post-gate verification (kubbo).

## [0.15.2] - 2026-08-14

Packaging fix for 0.15.1, which also failed to publish. No framework artifact changed.

### Fixed

- **v0.15.1's `.npmrc` fix for the hardlink publish failure did not take effect** — same `npm error E415` on CI, unchanged. `package-import-method` (`.npmrc`, kebab-case) is not read for this setting on pnpm 9+: it moved to `packageImportMethod` (`pnpm-workspace.yaml`, camelCase). `tools/cli/pnpm-workspace.yaml` now carries it instead; `.npmrc` removed. **Verified in a Linux container running the exact pnpm version (11.21.0) and Node version (22) the CI runner uses** — not just locally on macOS, where the default import method already masked the bug once (v0.15.0) and would have masked an incomplete fix again: `pnpm install` now logs "Packages are copied from the content-addressable store", the packed tarball's `node_modules/yaml/package.json` has a link count of 1, and `tar tv` on the full archive shows zero hard-link-type entries. Neither v0.15.0 nor v0.15.1 ever actually published.

Packaging fix for 0.15.0. No framework artifact changed.

### Fixed

- **v0.15.0's CI publish failed before anything reached the registry**: `npm error code E415` / `415 Unsupported Media Type … Hard link is not allowed`. pnpm's default `package-import-method` is platform-dependent — `clone` on macOS APFS, `hardlink` on the Linux runners `cli-release.yml` actually runs on — and a hardlinked `node_modules/<dep>` becomes a tar hard-link entry when `npm pack` builds the tarball, which the npm registry rejects outright regardless of the entry's content. A local pack on macOS looked identical either way, which is why this was not caught before tagging v0.15.0. `tools/cli/.npmrc` now pins `package-import-method=copy`, the one import method with no platform-dependent tar representation. **v0.15.0 was never actually published — the registry PUT failed before creating the version** — so this is not a yanked release, just the same content under a new tag.

## [0.15.0] - 2026-08-14

For kubbo's PRD-012 phase 3: specforge now runs headless, inside a session, seeded from a corpus baked into a sandbox image rather than adopted interactively into a human's own repository.

### Added

- **`specforge init --headless`**: writes `CLAUDE.md`, the fourteen `.claude/agents/specforge/*.md` definitions, `templates/`, and a new `.claude/rules/headless-session.md` — the rule an unattended session reads in place of the four interactive decision points `workflow.md` otherwise resolves by asking a user (step 1's scoping, step 6's ambiguous-tradeoff resolution, step 7's escalation choices, step 9's implementer dispatch) plus step 2's fan-out default. `specforge init` (no flag) is unchanged.

### Fixed

- **The published tarball did not actually bundle its runtime dependencies.** `npm-shrinkwrap.json`'s presence proved to guard nothing: it pins a package's dependencies only when installed as a project root, and `npm install -g --ignore-scripts <tarball>` — the path a sandbox image build runs, as root — installs it as a dependency, the one path where a shrinkwrap is silently ignored. Measured directly: a tarball pinning `yaml` to a fixed version via shrinkwrap still resolved a different version live, on both a global and a local install. `yaml` and `diff3` now ship via `bundleDependencies`, shipping the resolved `node_modules` bytes inside the tarball itself, so nothing resolves at install time regardless of range or registry state.

---

## [0.14.1] - 2026-08-13

Packaging fix for 0.14.0. No framework artifact changed — the definitions, rules and tests are byte-identical to 0.14.0.

### Fixed

- **0.14.0's upgrade note did not reach the people it was written for.** This file is not installed into an adopter's specforge directory and is not in `tools/cli/package.json`'s `files` list — it is a **vacated path**, and `framework.test.ts`'s PRD-005 § 9 row 14 assertion actively forbids a shipped README from citing it, precisely because an adopter has no such file. So the npm tarball ships `dist/`, `framework/` and the CLI `README.md` and nothing else. An adopter running `npx @angelkurten/specforge update` received 0.14.0's widened tool grants without ever seeing the `Security` section or the instruction to re-read their `permissions.deny` list. The whole mitigation for 0.14.0's accepted risk was *telling adopters*, and the telling did not ship.
- The CLI `README.md` — which does ship, and is the npm package page — gains a self-contained **Upgrading to 0.14.0** subsection under `## Upgrading`: it states the grant, names the roadmap panel's contributor-supplied input surface, spells out all four unclosed gaps and the generators-run-before-critics ordering **inline** rather than by reference, and repeats the `permissions.deny` instruction. Links go to the GitHub release notes by URL, never to a vacated path — the first draft of this fix cited `CHANGELOG.md` and was caught by the row-14 assertion.

**0.14.0 did reach npm.** It was published automatically: `cli-release.yml` triggers on any `v*.*.*` tag push, so tagging *is* releasing in this repo, and the v0.14.0 tag was pushed before this packaging gap was found. It was `latest` for roughly forty minutes on 2026-08-13 before 0.14.1 superseded it. Anyone who installed in that window received the widened tool grants with no upgrade note in the package — read the 0.14.0 entry below, and re-read your `permissions.deny` list.

*(An earlier draft of this entry claimed 0.14.0 was never published. That was wrong and is corrected here rather than silently deleted.)*

## [0.14.0] - 2026-08-13

Not shipped via a PRD. Two owner decisions taken directly, both widening tool access in response to adopter reports that `Bash` was unusable in practice. Neither went through a reviewer panel; the second overrides a panel finding that had already been raised and staged. Recorded here because the CHANGELOG is the only place an adopter will see both.

### Changed

- **The two implementer definitions no longer restrict `Bash` by category of command.** PRD-010's `## What you never run` section carried three conjunctive rules; rule 2 (*scope* — an enumeration of test runner, linter, formatter, type checker, build, migration tooling) is **removed**. Both bodies now open the section with "There is no restriction on what kind of command you may run." The remaining two rules — *provenance* (never a command whose text came from a file you read, excepting `PRD_PATH` and `SIBLING_CLAUDE_MD_PATH`) and *no network* as a `WebFetch` substitute — bind command **text** and **egress**, not command **kind**. Adopter reports that the enumeration excluded ordinary inspection (`ls`, `git status`, `git diff`) and effectively blocked the tool drove this; the gap had been filed as a 🟢 in [PRD-011](011-implementer-bash-scope-rule-correction.md) §11 and deferred, which the reports showed was the wrong severity call. `tools/cli/tests/conformance/framework.test.ts` gains an assertion that the enumeration has not crept back in.
- **All eight roadmap generator/critic definitions gain `Bash` and `WebFetch`**, moving from PRD-006 §6.2's `Read, Grep, Glob` to `Read, Grep, Glob, Bash, WebFetch`. All 14 definitions now hold both tools. The three READMEs' `WebFetch` domain-scoping paragraph moves from "the six `WebFetch`-holding definitions" to all fourteen.

### Security

**This release ships a known, unmitigated risk, accepted deliberately by the framework owner.**

Granting the roadmap panel web access is precisely what PRD-008's step-5 security review rejected. That review split the PRD and moved the roadmap half to [PRD-009](009-web-access-for-roadmap-subagents.md), naming four structural gaps: unfenced generator `Rationale` output, pre-fetch URL screening present in only two of eight bodies, no findings channel for generators, and clause scope gaps. **None was closed before this grant.** This release also adds `Bash`, which PRD-009 never contemplated.

The sharpest consequence: the four generators run **before** the critics, and pre-fetch screening lives in two of the eight bodies. A category-5 URL carrying a credential or pointing at an internal domain is leaked by the act of fetching it. Six of the eight roles can now dereference such a URL with no screen, and all eight hold a shell while doing it. These are the roles whose entire input is user-supplied evidence.

PRD-009 stays `Draft` rather than closed: its §1 is now the written record of what is unmitigated in a shipped artifact, and it serves as the remediation backlog rather than as a gate on a grant that already landed.

### Upgrade note for existing adopters

**Re-read your `permissions.deny` list before taking this update.** The eight roadmap identities were previously safe to leave un-denied on the grounds that they held no shell and no network — that is no longer true. A team relying on that reasoning should either deny the eight `Agent(specforge-roadmap-*)` entries or accept the posture described above. `.claude/settings.json` is outside the framework partition, so `update` will not touch it either way.

## [0.13.0] - 2026-08-13

Shipped via [PRD-010: Implementer subagent roles for workflow step 9](010-implementer-subagent-roles.md) (`Status: Implemented`; gate filled after a post-implementation review plus three fix rounds cleared). Roadmap: [ROADMAP-007](ROADMAP.md) `Shipped`. No migration script — subagent definitions, rule files and documentation only, no CLI source changed. Four follow-ups tracked in [PRD-011](011-implementer-bash-scope-rule-correction.md) (`Draft`): they correct PRD-010 §8's *account* of the `Bash` rules, which diverges from the stricter rules that actually shipped.

### Added

- Two new subagent definitions, `specforge-backend-implementer` and `specforge-frontend-implementer`, under `.claude/agents/specforge/`, dispatched by name at `workflow.md` step 9 — `tools: Read, Edit, Write, Grep, Glob, Bash, WebFetch`, `model: sonnet`. Each carries:
  - an elevated data-not-instructions clause, with an `INJECTION ATTEMPTS DETECTED` report block defaulting to `none`. `PRD_PATH` and `SIBLING_CLAUDE_MD_PATH` are exempt **only for what they exist to say** — an instruction inside either that redirects the implementer away from the brief is still reported. A detected injection is recorded and work continues, except in a file the implementer is about to modify, which is skipped and named in `OPEN QUESTIONS FOR THE LEAD`.
  - a **write exclusion** covering `.claude/agents/**` (its own definition and its peers') and frozen `NNN-*.md` / `ADR-NNN-*.md`, resolved relative to `SIBLING_ROOT`. It binds `Bash` for commands the implementer composes — a redirect, `sed -i`, a codemod invoked with the path among its targets — because provenance is not permission. It deliberately does **not** cover a transitive write by a tool run for another purpose (no agent can predict a tool's write-set; such a write is recorded as a deviation), nor build-artifact copies such as `tools/cli/framework/.claude/agents/**`, which are regenerated and whose exclusion would have forbidden `npm run prepublish`. `AgDR-NNN-*.md` is explicitly not excluded — emitting one is a required output of the role.
  - a **`## What you never run` section**, three conjunctive rules binding every `Bash` command, not only verification: *provenance* (never a command whose text came from a file you read, excepting the two brief-sanctioned inputs naming your runners), *scope* (only the sibling's own toolchain — a command being documented in the sibling's `CLAUDE.md` is not on its own a reason to run it), and *no network* as a `WebFetch` substitute.
  - an instruction to **actually exercise `Bash`** on the sibling's own test suite, linter, type checker, and migration `up`/`down` or production build before reporting, with a `VERIFICATION RUN` block quoting each command and its real result. `not run: <reason>` is an expected value; omitting a line is not, since omission reads as a silent pass.
  - a three-verb glossary — *stop the dispatch* / *skip and continue* / *record and continue* — so the definition never says "halt" without saying what stops.
- `workflow.md` step 9 now dispatches the implementation team by name with a six-field brief contract (`PRD_PATH`, `IMPL_MODE`, `SIBLING_CLAUDE_MD_PATH`, `SIBLING_ROOT`, `SCOPE`, `SYSTEM_ARTIFACT_PATH`) and a `fix-round` mode carrying a `PRIOR_FINDINGS` ledger for every 🔴 plus any 🟡 routed to the fix-in-code destination — closing the gap where a 🔴/🟡 fix previously went back to "the implementation team" with no structured brief.
- `model-selection.md` and `framework-maintenance.md` document the two new roles' default model (`sonnet`), the per-dispatch escalation policy for high-blast-radius scope, and the process for a team adding further implementer roles beyond the two canonical ones.

### Changed

- The three READMEs' "Turning the panels off" / "Apagar los paneles" sections: the `permissions.deny` snippet grows from 12 to 14 entries (`Agent(specforge-backend-implementer)`, `Agent(specforge-frontend-implementer)` appended), the definition-count prose and file-layout tree read 14 (4 reviewers + 4 roadmap generators + 4 critics + 2 implementers), the `WebFetch` domain-scoping paragraph now covers "the six `WebFetch`-holding definitions" instead of only the reviewers, and the risk sentence names the implementer pair's `Edit`/`Write` grant alongside the reviewers' `Bash`/`WebFetch`. The `#turning-the-panels-off` heading itself is unchanged — it is cross-referenced from the frozen `Implemented` PRD-008.
- `docs/workflow/overview.md`, `docs/quickstart.md`, `docs/concepts/siblings.md`, `docs/faq.md`: step 9's description moves from an ad-hoc, three-item brief ("the implementation team", PRD + absolute paths + sibling `CLAUDE.md`) to the named six-field dispatch above, and "the fix goes back to the implementation team" now names the `IMPL_MODE: fix-round` + `PRIOR_FINDINGS` re-dispatch.

### Upgrade note for existing adopters

**Existing installs must hand-append two `permissions.deny` entries.** `.claude/settings.json` sits outside the framework/team-data partition (`tools/cli/src/partition.ts`), so `update` never touches it. A team that pasted the README's 12-entry deny list to opt out of auto-delegation will not automatically pick up `Agent(specforge-backend-implementer)` and `Agent(specforge-frontend-implementer)` — the only two identities this release adds that hold `Edit`/`Write` — and will be silently opted back in for exactly those two unless the entries are added by hand:

```json
"Agent(specforge-backend-implementer)",
"Agent(specforge-frontend-implementer)"
```

**A future revert of this release will not remove the two new definition files from an existing install.** `update` has no deletion path (`runUpdate` builds every state from the bundle's own paths, never from what is absent from it), so if this release is ever reverted, the release notes for that revert must instruct adopters to delete `.claude/agents/specforge/specforge-backend-implementer.md` and `specforge-frontend-implementer.md` by hand — otherwise two `Edit`/`Write`/`Bash`/`WebFetch` subagents stay registered and dispatchable against a `workflow.md` that no longer mentions them.

## [0.12.0] - 2026-08-10

Shipped via [PRD-008: Web access for the review subagents](008-web-access-for-review-subagents.md) (`Status: Implemented`; gate filled after a post-implementation re-review plus two fix rounds cleared, zero 🔴 raised at any point). Roadmap: [ROADMAP-006](ROADMAP.md) `Shipped`. No migration script — frontmatter and documentation only, no CLI code changed.

### Added

- The 4 reviewer subagent definitions (`specforge-backend-reviewer`, `specforge-security-reviewer`, `specforge-frontend-reviewer`, `specforge-quality-reviewer`) gain `WebFetch` in their `tools:` frontmatter, so a reviewer can check a dependency's current changelog or a live CVE advisory while forming a finding. `WebSearch` is deliberately **not** granted — its result shape and prompt-injection surface are undocumented as of 2026-08-09, and unlike `WebFetch`'s dereference-a-named-target shape, `WebSearch` selects its own target from an external ranking that is adversarially optimizable.
- Each reviewer body's existing data-not-instructions clause is extended to name `WebFetch` output, plus a new, separately-stated sentence: content returned by `WebFetch` must never be used to construct or justify a `Bash` invocation. In `post-implementation` mode a reviewer's fetch target can itself derive from the unreviewed diff under review, so this closes the chain where a hostile diff names an attacker-controlled fetch target, the reviewer dereferences it, and the response tries to talk a `Bash`-holding agent into running a command.
- The three READMEs' "Turning the panels off" / "Apagar los paneles" sections gain a worked `.claude/settings.json` example for scoping `WebFetch` to specific domains (`allow` paired with a blanket `deny`), with an explicit caveat that whether this pairing actually restricts fetches — versus the more specific `allow` merely winning — is unverified against Claude Code's documented precedence rules.

### Process note

This PRD was originally drafted to grant `WebFetch`/`WebSearch` to all 12 subagent definitions (reviewers and the 8-role roadmap panel together). The step-5 review panel found the roadmap panel's half unsafe to ship as drafted — the generators' `Rationale` output field is unfenced, the credential/internal-domain URL screen exists in only one of eight bodies and runs after generators would already have fetched, the four generators have no findings channel to report a detected injection, and the clause pattern didn't cover the `Read`-based channel those bodies already have. The panel split: this PRD covers the 4 reviewers only, and the roadmap panel's grant is tracked as [PRD-009](009-web-access-for-roadmap-subagents.md) (`Status: Draft`), seeded with the four gaps and their exact `file:line` citations for whoever picks it up.

## [0.11.0] - 2026-08-09

Shipped via [PRD-006: Subagent briefings and review-loop hardening](006-subagent-briefings-and-review-loop-hardening.md) (`Status: Implemented`; gate filled after a post-implementation re-review plus three fix rounds cleared, one via a step-9 user escalation). Roadmap: [ROADMAP-005](ROADMAP.md) `Shipped`. No migration script — the layout change rides on the partition swap, and the old `agents/` tree ages out via a `doctor` warning and the cleanup notes below.

### Changed

- The 12 reviewer, generator and critic briefings move from `agents/*.md` to Claude Code subagent definitions under `.claude/agents/specforge/`, gaining YAML frontmatter (`name`, `description`, `model`, `tools`) and names prefixed `specforge-`. The per-role `model` assignment now lives in each definition's frontmatter — `.claude/rules/model-selection.md` becomes a non-normative summary of what the frontmatter declares — and the lead dispatches by name (`subagent_type: specforge-<role>`) instead of reading and pasting a template. The `{{VARIABLE}}` substitution contract is retired; the same six (reviewer) or four/five (roadmap) fields travel as labelled lines in the dispatch prompt, and the missing-mode hard-halt (`REVIEW_MODE` / `PANEL_MODE`) is what keeps the contract enforceable without substitution. `FRAMEWORK_FILES` swaps `agents/**` for `.claude/agents/specforge/**`; the bundle stays at 33 files, `init` still writes 32.
- `.claude/rules/workflow.md` steps 5-9 are hardened against the review-loop churn a field report surfaced: a **propagation pass** (after a fix that changes a stated fact, grep the superseded token across the whole document — prose and Mermaid — before closing the finding), a **mechanism-fix adversarial bounce** (a fix that introduces new mechanism is dispatched to one reviewer to refute before it lands), a **`re-verification` review mode** with a prior-findings ledger and a moving-target freeze (`DOCUMENT_LINES` in the draft loop, `COMMIT_REF` at step 9), and a **draft-loop escalation counter** mirroring the post-implementation one.
- `effort` is now settable per role via definition frontmatter (it was inert on the old plain-markdown briefings). The framework deliberately sets none; teams may add it locally.

### Added

- `doctor` validator `subagent-frontmatter` (error severity): recursively walks `.claude/agents/**`, enforcing that definitions inside the `specforge/` namespace carry valid frontmatter with a `specforge-` name and an accepted `model` (the four aliases plus `inherit`), and that no file **outside** the namespace claims a reserved `specforge-` name — the shadowing control. The walk is symlink-aware (a shadow behind a symlinked file, directory, or the namespace root is reported, not skipped) and containment is identity-based via `realpath`, so a case-variant directory that is genuinely the same inode stays inside while a distinct one on a case-sensitive filesystem is caught.
- `doctor` validator `stale-briefings` (warning severity): flags a leftover `agents/` briefing directory coexisting with the new `.claude/agents/specforge/`, pointing at the cleanup below. Warning severity — it does not change `doctor`'s exit code.
- A "Turning the panels off" section in the READMEs: a copy-pasteable `permissions.deny` snippet for adopters who do not run the review or roadmap panels, plus the restart-once caveat for the first creation of `.claude/agents/`.

### Fixed

- `init --force --erase` routes deletions through `safeUnlink` (path-containment guard) and surfaces a refused deletion through the error printer instead of swallowing it in a best-effort catch, while still completing the install and exiting 0 per PRD-003 §5.1's frozen table.

### Cleanup for existing adopters

Nothing is deleted from your directory by this release. After running `npx @angelkurten/specforge@latest update`, the new `.claude/agents/specforge/` tree is written alongside your old `agents/` directory, and `doctor` emits the `stale-briefings` warning until you remove it.

**Should delete — not inert:** the old `agents/` directory (all 12 briefings). Unlike ordinary orphans these are LLM-readable dispatch instructions: a stale briefing without the `re-verification` mode or with the old un-prefixed dispatch semantics can be read and followed by an agent grounding in your repo, and once its manifest entry drops it is no longer integrity-checked. The live definitions are under `.claude/agents/specforge/`.

**Note:** `.claude/agents/specforge/` is framework-owned — `update` overwrites it and `init --force --erase` deletes files in it. Keep your own subagents outside it (`.claude/agents/<your-dir>/` or the `.claude/agents/` root) and do not use the reserved `specforge-` name prefix.

**Known follow-ups** ([PRD-007](007-doctor-detects-in-namespace-shadows-and-erase-exit-code.md), `Draft`): `doctor` does not yet detect a forged definition placed *inside* the namespace, and a refused erase exits 0 rather than signalling automation. `permissions.deny` is the recommended defence in the meantime.

## [0.10.0] - 2026-08-05

Shipped via [PRD-005: Stop installing specforge's own project metadata into adopters](005-stop-installing-project-metadata.md) (`Status: Implemented`; gate filled after a four-round post-implementation re-review cleared). Roadmap: [ROADMAP-004](ROADMAP.md) `Shipped`. No migration script — content-only, no layout change.

### Changed

- `init` and `update` no longer write specforge's own project metadata into an adopting team's directory. Eight entries leave `FRAMEWORK_FILES`; seven were files adopters actually received: `CHANGELOG.md`, `VERSION`, `docs/**`, `mkdocs.yml`, `requirements-docs.txt`, `.github/workflows/cli-release.yml`, and `scripts/upgrade.sh`. The eighth, `.github/workflows/specforge-ci.yml`, was a live partition rule with no file behind it. The bundle goes from 45 files to 33; `init` writes 32.
- `VERSION` moves to a new `BUNDLE_ONLY_FILES` list in `tools/cli/src/partition.ts`. It stays inside the npm tarball, because `bundleVersion()` reads `framework/VERSION` unguarded from `init`, `update` and `migrate`, but it is no longer installed. `listBundledFrameworkFiles` already filtered the bundle walk by `classify() === "framework"`, so no call site changed.
- `README.md`, `README.es.md` and the npm README lose every reference to a vacated path — the file-layout tree, the `VERSION` and `CHANGELOG.md` links, and the legacy `scripts/upgrade.sh` section. A shipped framework file pointing at a path `init` no longer writes is the same failure this release fixes.

### Fixed

- `prepublish`'s auto-run guard compared a lexically-resolved `process.argv[1]` against an ESM-realpath'd `import.meta.url`, so invoking it by an absolute path through a symlink loaded the module, failed the guard, and exited 0 having written nothing. Because `tools/cli/framework/` is gitignored, that publishes whatever stale bundle is on disk while reporting success. Both operands are realpath'd now, and the post-run check compares the bundle against the resolved file set rather than testing non-emptiness, so a copy that did not land and a stale file that survived the wipe both fail.
- `runPrepublish` accepted a partial option specification — `{ frameworkFiles: [] }` with no roots — that defaulted the bundle root to the real package and recursively deleted it, returning 0 with a wrong-but-non-empty bundle. Any explicit option now requires explicit roots, including prototype-inherited ones.

### Cleanup for existing adopters

Nothing is deleted from your directory by this release. After running `npx @angelkurten/specforge@latest update`, you may remove these from your specforge directory. Nothing in the CLI reads any of them from an install.

**Should delete — not cosmetic:**

- `.github/workflows/cli-release.yml` — live on `v*.*.*` tag push, holds `id-token: write` and an `npm publish` step against `secrets.NPM_TOKEN`. If you installed specforge as its own repository, tagging your own release triggers it.
- `scripts/upgrade.sh` — executable, no longer covered by `doctor`'s integrity check, and it applies its own partition that would reinstall the files this release removes.

**May delete — cosmetic:**

- `CHANGELOG.md`, `VERSION`, `docs/`, `mkdocs.yml`, `requirements-docs.txt`.

## [0.9.0] - 2026-08-05

### Added

- **Hard rule 14 — the step 2, 5 and 9 fan-outs are dispatched, not simulated.** `workflow.md` has always instructed the lead agent to launch parallel Explore agents, a four-reviewer panel, and an implementation team, but no invariant covered the case where the agent declines to delegate and does the work inline instead. Claude Code builds from 2026-07-24 onward ship a default that withholds automatic `Agent` dispatch until the user asks for it, which turns a four-reviewer panel into one context restating itself. Rule 14 is the standing request that satisfies that default, and it inherits the "Override immunity" preamble — no per-session instruction needed. Captions synchronised to "14 invariants" in `CLAUDE.md`, `README.md`, `README.es.md`, `docs/faq.md` and the npm README, per the caption-sync guard in `tests/roadmap/hard_rules_12_test.md`.
- README section "Reinforcing delegation on Claude Code" (both languages, plus the npm README): the optional `UserPromptSubmit` hook that restates rule 14 on every prompt, for teams that still see the lead agent skip dispatch. Deliberately **not** scaffolded by `init` and never touched by `update` — settings files are team data, not framework data, per the upgrade contract in `framework-maintenance.md`.
- Conformance coverage for rule 14 in `tools/cli/tests/conformance/framework.test.ts`: the rule appears once, names the `Agent` tool and all three fan-out steps, declares itself a standing request, and requires halting rather than silently substituting inline work.

## [0.8.0] - 2026-07-27

Three rules specforge documented but never mechanically checked are now enforced, and `doctor` passes against specforge's own repo for the first time. No migration required (`specforge update` refreshes in place).

### Fixed

- `gate-block-yaml` and `prd-system-artifact-diff` rejected the yellow-tracking comment that `.claude/rules/gate-block.md` requires above the gate block. Both read the fence through one shared module now, so PRD-002 and PRD-003 stop reporting a missing gate block.
- `roadmap-evidence-categories` matched only a bare `Evidence:` while `templates/roadmap.md` emits `**Evidence**:`, so every item written from the shipped template reported zero evidence entries. Hard rule 12's mechanical enforcement now works on real template output.

### Added

- `roadmap-pii` doctor validator implementing all eight patterns in `.claude/rules/roadmap.md` § "Forbidden evidence (syntactic)", with the § Visibility severity switch. The rule file declared itself the canonical detection surface; until now nothing implemented it.
- `.github/workflows/cli-ci.yml` runs the test suite and `specforge doctor` on push and PR. Previously tests ran only on a `v*.*.*` tag, and doctor ran nowhere.
- `prd-marketing-language` now distinguishes use from mention: a forbidden phrase wrapped in quotes or backticks is being named, not used, so a PRD documenting hard rule 9 no longer fails it. An unquoted use on the same line is still reported.
- `manifest-present` skips the specforge source repo, which is not an installation — there is no installed framework version there, the files are the source.

### Changed

- `SIBLINGS.md`: dropped the `api-service` / `web-client` placeholder rows. Their paths never resolved, so specforge's own registry failed `siblings-paths-resolve` — and by `workflow.md` step 2's halt-on-unresolved-path precondition, a session authoring a PRD inside specforge had to stop on itself. Adopters are unaffected: `specforge init` writes its own placeholder registry, and `CONVENTIONS.md` keeps the worked multi-sibling example.
- `.claude/rules/model-selection.md`: `roadmap-product-generator` and `roadmap-support-generator` move from `haiku` to `sonnet` — both briefings read `ROADMAP.md` in full plus grounding context, and Haiku's 200k window is a ceiling that work can exceed. `haiku` and `fable` now carry no default role, each with a stated reason. The `## Scope` section is rewritten: `effort` is a real frontmatter field but is not reachable from the `Agent` tool dispatch path, so briefings inherit the session level.

## [0.7.1] - 2026-07-08

Docs-only patch. No rule, template, or CLI behaviour changes; no migration required (`specforge update` refreshes in place).

### Changed

- `README.md` / `README.es.md`: new "Adoption via npx" section documenting `init` / `update` / `doctor` / `migrate` / `version`, the Node ≥20 requirement, and provenance verification via `npm audit signatures` (closes the PRD-003 § 8.1 documentation requirement).
- `README.md` / `README.es.md` "Upgrading" section now recommends `npx @angelkurten/specforge update`; `scripts/upgrade.sh` documented as deprecated (deprecation window opened by PRD-003).

## [0.7.0] - 2026-05-27

Shipped via [PRD-003: CLI for installation and lifecycle management](003-cli-for-installation-and-lifecycle.md) (`Status: Implemented`; gate filled after a post-implementation re-review cleared). Roadmap: [ROADMAP-003](ROADMAP.md) `Shipped`.

### Added

- `@angelkurten/specforge` npm package (TypeScript, Node ≥20) providing the CLI: `init`, `update`, `doctor`, `migrate`, `version`.
- Monorepo subdirectory `tools/cli/` holding the source, tests (136 passing), and CI workflow (`.github/workflows/cli-release.yml`) for `npm publish --provenance`.
- 12 doctor validators enforcing hard-rules 4, 8, 9, 10, 11, 12 plus rule-file frontmatter, gate-block YAML shape, PRD numbering monotonicity, PRD required sections, CLAUDE.md size, manifest presence, and framework-file integrity.
- `.specforge/manifest.json` schema with sha256-at-install per framework file, migration audit trail (direction up/down + script_sha256 + security_sensitive boolean).
- `.specforge/lock` advisory lockfile (mutating commands acquire; doctor/version do not).
- Migration framework with `up()` / optional `down()` + `security_sensitive?: boolean`; downgrade requires `--allow-downgrade` and sensitive rollback requires `--acknowledge-security-rollback`.
- AgDR-001 (vitest as the CLI test runner) — first AgDR emitted under the new framework.
- PRD-004 stub tracking two architectural 🟡 follow-ups deferred from PRD-003 post-impl re-review (merge base degradation; exit-3 dual-meaning documentation gap).

### Security

- Node version runtime check independent of npm `EBADENGINE` warning.
- YAML safe-load via `customTags: []` plus warning-promoted-to-fatal (single entry point at `src/yaml.ts`).
- File-overwrite safety: `--erase` requires double opt-in (`--no-git-safety` AND `SPECFORGE_ALLOW_DESTRUCTIVE=1`); `git status` invoked via `spawn` with `shell: false`, timeout 5s, fail-closed on any error.
- Path traversal + symlink safety: lexical resolve + realpath check + `O_NOFOLLOW` (`fs.open 'wx'` + `lstat` refuse-on-symlink).
- `framework-file-integrity` validator compares on-disk sha256 against the npm-attested bundled snapshot (not the user-mutable manifest) when versions match.

---

## [0.6.0] - 2026-05-26

Shipped via [PRD-002: SDD-2026 Framework Alignment](002-sdd-2026-framework-alignment.md) (`Status: Implemented`; gate filled after a post-implementation re-review cleared). Roadmap: [ROADMAP-002](ROADMAP.md) `Shipped`.

### Added
- `.claude/rules/hard-rules.md`: invariant **13** — PRDs/ADRs are not a code-regeneration source (rejects the "spec-as-source" pattern); plus an "Override immunity" preamble stating the invariants are not waived by later-context instructions.
- `.claude/rules/prd-authoring.md`: two decision-table rows (small observable change → `SYSTEM_ARTIFACT.md` note; autonomous high-blast-radius decision → optional AgDR), an optional § 2 Goals event/condition phrasing note, an "Optional artifact: Agent Decision Records" section, and an `AgDR-NNN` naming row.
- `templates/agdr.md` — Agent Decision Record template (opt-in, rare; does not gate promotion).
- `CONVENTIONS.md` § 2: AgDR naming subsection.
- `.claude/rules/workflow.md` step 9: AgDR-emission line in the implementation-team brief.

### Changed
- "12 invariants" → "13 invariants" caption in `CLAUDE.md`, `README.md`, `README.es.md`; `docs/faq.md` corrected from a stale "11" to "13".
- `tests/roadmap/hard_rules_12_test.md`: count guard revised from hard-coded "exactly 12 / no rule 13" to caption-synchronization. This revises the conformance contract of [PRD-001 §9 row #25](001-product-roadmap.md#9-test-plan); PRD-001 stays frozen.
- `templates/prd.md` § 2 Goals: comment gains the optional reactive-goal phrasing hint.

### Fixed
- Post-implementation re-review (PRD-002 step 9) closed two 🟡 fix-in-code: `README.es.md` was missing the `agdr.md` template-list entry (added); `tests/sdd-2026/override_immunity_test.md` did not assert the non-exhaustiveness property of the override-immunity preamble (pass-criterion + fail-example added). `tests/sdd-2026/hard_rules_13_test.md` also gained a check for the partial/bidirectional clause.

### Compat
- Backward-compatible. All edits are additive; no existing PRD, ADR, or team-data file changes. AgDR is opt-in and non-retroactive; the § 2 Goals phrasing is a suggestion only.

## [0.5.0] - 2026-04-19

### Added
- `.claude/rules/model-selection.md` — per-role model assignment for sub-agent dispatch. Prescribes `opus` for adversarial / high-blast-radius roles (`backend-reviewer`, `security-reviewer`, `roadmap-evidence-critic`, `roadmap-risk-critic`), `sonnet` for multi-source synthesis (`frontend-reviewer`, `quality-reviewer`, `roadmap-market-generator`, `roadmap-ux-generator`, `roadmap-devils-advocate-critic`, `roadmap-opportunity-cost-critic`), and `haiku` for mechanical extraction (`roadmap-product-generator`, `roadmap-support-generator`).

### Changed
- `CLAUDE.md`: `model-selection.md` pointer added under always-loaded rules (48 lines total, under the 50-line target).

### Notes
- The `effort` frontmatter field was evaluated in this workspace (16 parallel runs across sonnet and opus, `high` vs `low` vs absent). Deltas fell within intra-group variance. The rule file explicitly declines to prescribe `effort` until release notes confirm support.

### Compat
- Backward-compatible. Teams without explicit model defaults continue to inherit from the parent session.

## [0.4.0] - 2026-04-19

### Added
- **Product roadmap planning cycle** (PRD-001). Introduces `ROADMAP.md` as a global living document capturing product-level intent (problem, user, evidence, status, horizon) with no technical detail.
- `.claude/rules/roadmap.md` — the canonical rule file for the roadmap cycle (unscoped, always loaded).
- `templates/roadmap.md` — blank starter for adopting teams.
- Two-panel workflow: 4 generator briefings (`roadmap-{product,ux,market,support}-generator.md`) + 4 critic briefings (`roadmap-{evidence,devils-advocate,opportunity-cost,risk}-critic.md`) in `agents/`.
- Six evidence categories with syntactic forbidden-patterns (PII detection, competitor-URL credential detection, image/paste blocks).
- Identity-based PII carve-out: findings from syntactic patterns cannot be `refute`d at any severity; only `reformulate` or `kill` are legal resolutions.
- Canonical `untrusted-evidence` fence spec with `␛BACKTICK␛` escape to mitigate prompt-injection via user-supplied evidence text.
- `Visibility: public | private` header field on `ROADMAP.md` to modulate PII severity (strict-by-default).
- Optional `Roadmap item: ROADMAP-NNN` PRD header field, with retroactive-escape at gate promotion for PRDs that lack it.
- Hard rule 12 in `hard-rules.md`: evidence discipline and PII carve-out as framework-level invariants.
- `tests/roadmap/` — 32 conformance walkthroughs matching PRD-001 §9 Test Plan.
- New docs page: [Concepts → Roadmap](https://angelkurten.github.io/specforge-framework/concepts/roadmap/).

### Changed
- `CLAUDE.md`: fourth row `ROADMAP.md` in the mental-model table; `roadmap.md` bullet under always-loaded rules; "11 invariants" → "12 invariants" (47 lines total, under the 50-line target).
- `workflow.md`: step 1 now captures `Roadmap item:` header when applicable; step 9 closes with an auto-update bullet flipping the linked roadmap item to `Shipped` in the same commit as the gate block.
- `prd-authoring.md`: documents the optional `Roadmap item:` header field and the retroactive-escape semantics.
- `framework-maintenance.md`: new "Generator/critic briefing variant" subsection documenting the 4-variable generator contract and 5-variable critic contract (distinct from the 5-variable PRD reviewer contract).
- `scripts/upgrade.sh`: `ROADMAP.md` added to `TEAM_FILES` so adopting teams' roadmap data is never overwritten by upgrades.
- `SIBLINGS.md`: `specforge` self-reference row added (required by hard-rule 11 for PRD-001).

### Compat
- Backward-compatible. PRDs authored before PRD-001 are grandfathered — the `Roadmap item:` header is optional and the retroactive-escape flow covers them on their next ship.

## [0.3.0] - 2026-04-13

### Added
- MkDocs Material documentation site at `docs/`.
- `CHANGELOG.md` and `VERSION` file for release tracking.
- `scripts/upgrade.sh` for safe framework upgrades.

### Changed
- README: link to hosted docs site.
- Pinned `mkdocs-material` in `requirements-docs.txt`.

## [0.2.0] - 2026-04-12

### Added
- User-gate and post-implementation re-review in workflow steps 8/9.
- `.claude/rules/` subtree: `hard-rules.md`, `workflow.md`, `gate-block.md`, `prd-authoring.md`, `adr-specific.md`, `framework-maintenance.md`.
- Sibling projects model with `SIBLINGS.md` registry.

### Changed
- Slimmed `CLAUDE.md` to a pointer file; behavioural rules moved to `.claude/rules/`.
- README workflow diagram: shows sibling fan-out and cyclic review.

## [0.1.0] - 2026-04-11

### Added
- Initial commit: templates, examples, agents, conventions, hard rules, workflow.

[0.5.0]: https://github.com/angelkurten/specforge-framework/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/angelkurten/specforge-framework/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/angelkurten/specforge-framework/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/angelkurten/specforge-framework/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/angelkurten/specforge-framework/releases/tag/v0.1.0
