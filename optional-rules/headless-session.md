---
name: headless session defaults
description: Declared defaults for the workflow decision points that need a user to answer them, for an installation whose sessions run non-interactively.
---

# Headless session

This installation's sessions run without an interactive channel. `workflow.md`
resolves six decision points by asking the user; a session with no user cannot
ask, and a session that stops at a question it cannot ask produces nothing.
This file declares what to do at each of them instead.

**The declaration is the file, and the file is unconditional.** Nothing here
is guarded by an environment variable or a runtime probe: nothing carries a
process variable into a markdown file's applicability, and a rule whose
activation nothing can observe is inert. `specforge init --headless` writes
this file and an ordinary `specforge init` does not, so its presence in
`.claude/rules/` is what says the installation is headless. An installation
that acquires an interactive channel deletes the file; it does not add a
condition to it.

These defaults specialize `workflow.md` for a session with no user. Every
invariant in `hard-rules.md` continues to apply in full, its § Override
immunity included: this is a rule file, and an invariant outranks every rule
file.

## Declared defaults

| Point | Default |
|---|---|
| **Step 1 — scoping** | Proceed with the request as given. Do not call `AskUserQuestion`. Record every scoping assumption in the PRD's § 11 Open Questions, so the assumption is visible to the human who reads the document rather than lost in the session. **The step-1 triage gate fires here, with one override.** Headless applies `prd-authoring.md`'s decision table as written, the **No PRD** rows included: a bug fix, an internal refactor, or a change with observable behaviour below the size floor is done directly, with no grounding fan-out and no panel. A row read off a table is a rule, and this file withholds judgement from a session with no user, not rules. **The override: a sibling with no PRD in the corpus gets one regardless of size** — `workflow.md` step 1's first-change exception, which outranks every No-PRD row. That first PRD is what creates the `SYSTEM_ARTIFACT.md` and the design record the floor assumes already exist; without it the No-PRD row files the rationale into a document that does not exist. From the second change on, the table decides. |
| **Step 2 — grounding fan-out** | One grounding agent per sibling row in `SIBLINGS.md`. The registry is read exactly as it is read anywhere else; there is no headless special case, and a registry with one row means one agent. |
| **Step 5 — panel size** | Apply `workflow.md`'s step-5 trigger table unchanged: dispatch the roles whose surface the PRD carries, as one batch, and skip the roles whose trigger does not fire. A static page with no API, no data model and no trust boundary draws `specforge-quality-reviewer` and `specforge-frontend-reviewer` — not four. **This file withholds judgement from the session, not rules**, and the table is mechanical: "does § 5 name an endpoint?" is read off the document, not weighed. `specforge-quality-reviewer` fires unconditionally, so the panel is never empty, and step 9's re-selection against the diff still catches surface the draft did not promise. Report the skipped roles and their triggers in the session's own output, since no user is present to ask. A dispatched sub-agent does not dispatch further sub-agents. |
| **Step 6 — trade-offs** | Take the fix the reviewer recommended. Do not call `AskUserQuestion`. Record the discarded alternative in § 11, so the trade-off the session resolved on its own is on the record. |
| **Step 8 — post-merge** | Option (a): proceed to step 9 with the PRD just merged, **in the same turn, without ending the session first.** `workflow.md` asks this on every ship, not only on an ambiguity, so it is the one decision point a headless session reaches every time, and it is not a resting point. A merged PRD with `../app` still holding only its `README.md` is not a partial answer to the request — it is not an answer at all. |
| **Step 9 — escalation** | Option (ii): move the PRD back to `Draft`, strip the gate fields, explain why at the top, and stop. Never option (iii) — waiving a finding is a human act, and a session with no human cannot perform it on one's behalf. |
| **Environment** | Do not read this session's own process environment — `env`, `printenv`, `process.env`, `os.environ`, `/proc/self/environ`, an exported shell variable — into any file the session writes or commits. A PRD's § 8 asks about auth, secrets and PII, which is the one prompt that makes transcribing a live credential look like grounding. Name the secrets a design depends on; never quote the values this process holds. |

The last row is not a `workflow.md` gap. It is here because the same absence
of a user that produced the other six also means nothing reviews what the
session writes before it is committed.

## The one failure mode this file exists to prevent

**A session that writes a PRD, merges it, and ends has not done a smaller
version of the task. It has not done the task.** Nobody reads a request typed
into kubbo as "produce a document describing what to build" — every request
is a request for `../app` to hold the described product when the session
ends, and a PRD is step 4-7 of nine, not the deliverable. If `../app` still
holds nothing but its `auto_init` `README.md` when this session's last turn
ends, the session has failed the request regardless of how good the PRD is.

This is not a hypothetical failure mode. A real headless run, given nothing
but a plain request and no hint that a workflow exists to follow, produced an
excellent PRD — grounded, panel-reviewed, findings applied — and then ended.
It never opened `../app`. The step-8 row above already said to proceed; it
did not fire, because by the time step 8 is reached the PRD has just
absorbed most of a session's attention and finishing it can read as
finishing the work. It is not. **Reaching step 8 is the middle of the
request, not the end of it, and nothing about writing a good PRD is itself
permission to stop.** Proceed to step 9 in the same turn — the same session,
no new message, no re-reading this file to decide whether to — every single
time a PRD is merged, with no exception for a request that seemed to only
need the plan.

## The mirror-image failure mode: stopping after the PRD is not fixed by skipping it

**The fix above is not "always write a PRD." It is "whatever `workflow.md`
routes this request to, finish it."** The failure that section describes is a
session that produces a design and no product. Its mirror is a session that
produces a product and no design *for a request that warranted one* — and the
routing decision between them belongs to `prd-authoring.md`'s decision table,
not to this file and not to a size judgement improvised mid-session.

**Earlier versions of this file said every request gets the nine steps, and
that was wrong.** It was written after two runs ("a clock app", "a todo app")
skipped `workflow.md` and wrote straight into `../app`, and it over-corrected
from those two into an absolute. The absolute did not hold in practice either:
a headless run asked to change a link label and a heading size cited the
decision table's No-PRD row and did the work directly, exactly as the table
says to — with this file still claiming no such exception existed. A rule the
sessions do not follow is not a control, it is a note.

So the routing is the table's, and the table's floor is calibrated on a
sibling that already carries a `SYSTEM_ARTIFACT.md` and a PRD history. **That
calibration is the whole content of the step-1 override**: an empty corpus has
neither, so the first change writes a PRD however small it looks, and every
change after it is routed by the table like anywhere else.

What this section still forbids, unchanged: **abandoning a request halfway
through whichever route it took.** A PRD merged with `../app` untouched fails
the request. So does code shipped against a PRD whose panel never ran. Both
skip half of `workflow.md` — and the half you skip is not something request
size gets to decide, even though request size decides which route you are on.

**Selecting the panel by surface is not a route change**: the step-5 row
narrows *which roles* review a document that is being reviewed, and every step
of that route still runs. A backend reviewer reading a static page produces
nits, and paying for it is not rigour.
