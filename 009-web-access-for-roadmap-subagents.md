# PRD-009: Web access for the roadmap subagents

**Status**: Draft
**Date**: 2026-08-09
**Author**: AI-assisted
**Priority**: P3
**Depends on**: PRD-006, PRD-008
**Supersedes**: PRD-006 (partial — §6.2's tools table for the 8 roadmap roles; PRD-006 otherwise stands, frozen, aside from PRD-008's separate, disjoint supersession of §8's "no new network calls" phrase)

> **Note**: Framework-internal PRD. Impacted sibling is `specforge`. This is
> a **stub**, split out of PRD-008's original combined draft during that
> PRD's step-5 review. It is a placeholder for scope, not a finished design;
> its own review loop runs when it is picked up. Do not grant the roadmap
> panel `WebFetch`/`WebSearch` by copying PRD-008's shape verbatim — the
> reviewer panel's shape does not close the gaps named below, which is why
> this PRD exists separately rather than as a same-commit extension of
> PRD-008.
>
> ---
>
> ⚠️ **The grant landed on 2026-08-13 without this PRD's design, by owner
> decision.** All eight roadmap definitions now carry
> `tools: Read, Grep, Glob, Bash, WebFetch` — `Bash` as well as `WebFetch`,
> which is wider than even this PRD contemplated. The four gaps in §1 were
> presented to the owner and **accepted as known, unmitigated risk**; none
> was closed first. The paragraph above is therefore a description of what
> was *not* done, retained deliberately.
>
> **This PRD stays `Draft` rather than being closed.** Its §1 is now the
> written record of what is unmitigated in the shipped artifact — the
> highest-value document in the repo for whoever next asks why a roadmap
> critic holds a shell and a fetch tool. Closing it would delete that
> record. What changes is its purpose: it is no longer a gate on the grant
> (the grant shipped), it is the remediation backlog for a grant already
> live. §§2-11 stay `[TBD]` until that work is scheduled.
>
> **Sharpest consequence, stated plainly:** the four generators run *before*
> the critics, and pre-fetch URL screening exists in two of eight bodies.
> A category-5 URL carrying a credential or pointing at an internal domain
> is leaked by the act of fetching it. Six of the eight roles can now
> dereference such a URL with no screen at all, and all eight hold `Bash`
> while doing it.

## Impacted Projects

| Project | Impact |
|---------|--------|
| **specforge** | The `tools:` frontmatter of the 8 roadmap definitions under `.claude/agents/specforge/` (4 generators, 4 critics) gains web access, scoped and gated by whatever this PRD's design resolves for the four gaps in §1. Likely touches: the generator output schema (fencing or forbidding fetched-content paraphrase in the `Rationale` field), all 8 bodies' pre-fetch screening (not only the evidence critic's), a new reporting channel for generators (which currently have no findings/severity mechanism), and `tools/cli/tests/conformance/framework.test.ts`. May also touch `.claude/rules/roadmap.md` if the fence spec itself needs a stated boundary around fetched-vs-dispatch-prompt content — unlike PRD-008, which left that file untouched. |

---

## 1. Problem Statement

PRD-008 originally proposed granting `WebFetch`/`WebSearch` to all 12
subagent definitions in one PRD. The step-5 review panel (security
reviewer, `draft` mode) found the roadmap panel's half unsafe to ship as
drafted, independent of the reviewer panel's half (which needed one fix and
shipped as PRD-008). Four structural gaps, each in a different place, seed
this PRD's scope:

1. **Unfenced output channel.** The four generator bodies fence exactly two
   input fields — `Problem / outcome` and each Evidence entry
   (`specforge-roadmap-market-generator.md:101-108`, `:119-124`, and the
   equivalent sections in the other three generators) — but leave the
   `Rationale` field of their own *output* unfenced
   (`specforge-roadmap-market-generator.md:128`,
   `specforge-roadmap-product-generator.md:124`,
   `specforge-roadmap-ux-generator.md:127`,
   `specforge-roadmap-support-generator.md:129`). Before any web-fetch
   capability that was safe, because everything a generator could write
   there was either its own synthesis or content the lead had already
   fenced on the way in. A generator that fetches live content and
   paraphrases it into `Rationale` routes untrusted bytes to the four
   critics and the lead with no fence and no untrusted marking — the
   fence contract is bypassed through the output side, not the input side
   PRD-008's clause pattern addresses.
2. **Pre-fetch screening does not exist where fetching would happen.**
   `.claude/rules/roadmap.md`'s credential-shaped-parameter and
   internal-domain screens for category-5 URLs are implemented in exactly
   two files today — `specforge-roadmap-evidence-critic.md` and
   `specforge-roadmap-market-generator.md` (verified: `grep -l` for the
   screen text across all 8 roadmap bodies returns only these two) — and
   the generative flow runs generators before critics. A URL carrying a
   credential or pointing at an internal domain is already leaked by the
   act of fetching it — screening it afterward, in a different subagent,
   on a later turn, is too late by construction. The market generator's
   own copy is scoped to what it *proposes*, not what it *fetches* — it
   closes with "pre-filter your own **proposals** accordingly"
   (`specforge-roadmap-market-generator.md:55`). The other three
   generators carry no pre-fetch hygiene text at all.
3. **Generators have no findings channel.** The four generator bodies'
   report contract is exactly three verdict lines and a candidate
   list — `N CANDIDATES PROPOSED` / `BLOCK` / `NO VIABLE CANDIDATES`
   (`specforge-roadmap-product-generator.md:81-83`, equivalent in the
   other three) — no 🔴/🟡/🟢 mechanism exists for a generator to report
   "I fetched this URL and it looked like an injection attempt."
   `BLOCK`'s only defined trigger is a missing/wrong `PANEL_MODE` or an
   unreadable input path (`specforge-roadmap-product-generator.md:30`,
   `:82`). Detection without a reporting path is a silent failure: the
   realistic outcomes are the generator silently drops the content or
   misuses `BLOCK` outside its defined trigger.
4. **Clause-scope mismatch.** The roadmap bodies already read untrusted,
   user-supplied content off disk today (`ROADMAP.md`'s category-4/5/6
   fields, via `Read`) with no data-not-instructions coverage for that
   channel — verified: a grep for the reviewer-style data-not-instructions
   clause across all 8 roadmap bodies returns nothing. This is a
   pre-existing gap PRD-008's pattern would need to close alongside the
   new `WebFetch`/`WebSearch` channels, not leave it as the one channel
   still uncovered in the very edit meant to add this class of
   protection. (For contrast: PRD-008's reviewer clause enumerates all
   four of the reviewers' channels — `Read`, `Grep`, `Glob`, `Bash` — at
   `specforge-security-reviewer.md:64-67`, which is why the equivalent
   gap does not survive for reviewers.)

## 2. Goals (seed scope — not final)

- Close gap 1: either fence `Rationale` whenever it restates or paraphrases
  fetched content, or forbid fetched content from `Rationale` entirely and
  require it to land only in a fenced Evidence entry with a capture date.
- Close gap 2: make the credential/internal-domain screen a pre-dereference
  obligation in all 8 roadmap bodies, not a post-hoc check the evidence
  critic performs on already-fetched or already-proposed URLs.
- Close gap 3: give the 4 generator bodies an explicit reporting slot for a
  detected injection attempt, separate from their candidate-proposal
  output.
- Close gap 4: scope the data-not-instructions clause to
  `Read`/`Grep`/`Glob` plus whichever of `WebFetch`/`WebSearch` this PRD
  grants — not just the newly-granted tools.
- Resolve `WebSearch` on its own merits for this panel: PRD-008 §3 deferred
  it framework-wide pending documentation of its result shape; this PRD
  should not re-open that judgment without new information, but should
  state explicitly whether the roadmap panel's fetch-then-fence design
  (once gaps 1-4 are closed) makes `WebSearch` safe to add later, or
  whether the target-selection risk PRD-008 §3 named (adversarially
  optimizable ranking) applies here at least as strongly given the
  generators' predictable `DOMAIN_CONTEXT`-plus-competitor-name query
  shape.

## 3. Non-Goals (seed scope — not final)

- `WebSearch`, on the same provisional grounds as PRD-008 §3, unless this
  PRD's design specifically re-examines and overturns that judgment (see
  §2's last bullet).
- Any change to the reviewer panel's grant (PRD-008, shipped separately).
- Any change to panel composition, model assignments, or severity scheme.

## 4. User Flows / Design

*Deferred — sections 4 through 11 are unwritten. This PRD is a stub: it
exists only to carry the four structural gaps §1 documents, seeded during
PRD-008's step-5 review. Its own grounding, design, and review loop run
when it is picked up; see §1 for the seed scope and §2/§3 for the
provisional goals and non-goals, which may change once this PRD's own
drafting pass runs.*

## 5. API

*Deferred — see §4.*

## 6. Data Model

*Deferred — see §4.*

## 7. Architecture

*Deferred — see §4.*

## 8. Security

*Deferred — see §4.*

## 9. Test Plan

*Deferred — see §4.*

## 10. Migration Plan

*Deferred — see §4.*

## 11. Open Questions

- [ ] Everything — this PRD has not yet been drafted past §1-§3.

---

## Gate: Promotion to `Implemented`

```yaml
commit_hash: [TBD]
tests:
  - [TBD]
system_artifact_diff:
  - [TBD]
```
