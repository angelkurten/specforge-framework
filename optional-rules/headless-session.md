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
| **Step 1 — scoping** | Proceed with the request as given. Do not call `AskUserQuestion`. Record every scoping assumption in the PRD's § 11 Open Questions, so the assumption is visible to the human who reads the document rather than lost in the session. |
| **Step 2 — grounding fan-out** | One grounding agent per sibling row in `SIBLINGS.md`. The registry is read exactly as it is read anywhere else; there is no headless special case, and a registry with one row means one agent. |
| **Step 5 — panel size** | Exactly four reviewers — backend, frontend, security, quality — dispatched as one batch. `workflow.md` says "a typical panel of 4 … adapted to the domain"; headless fixes the number, because without a user to weigh it the panel's width is a cost and concurrency term rather than a judgement call. A dispatched sub-agent does not dispatch further sub-agents. |
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

## The mirror-image failure mode: skipping steps 1-7 outright

**The fix above is not "prefer code over a PRD." It is "do both, always, in
order."** A session that reads the request, judges it small enough to not
need `workflow.md`'s nine steps, and writes straight into `../app` — no
grounding, no PRD, no panel — has failed the request exactly as completely
as one that stops after the PRD, for the same reason: `workflow.md`'s whole
premise is that a panel's judgement on a design is worth more than one
model's, on **every** request this installation serves, including the ones
that look like they don't need it. "This is simple enough to skip ahead" is
not this session's call to make — it was never the user's call either, which
is `hard-rules.md`'s entire reason for the panel existing at all, and a
session with no user does not inherit a discretion nobody granted it.

There is no request-shape exception anywhere in this file. Small requests get
the same nine steps as large ones — a one-file static page still gets a PRD
(possibly a short one; nothing here sets a length floor), still gets grounded
against `SIBLINGS.md`, still gets the four-reviewer panel from step 5. The
panel is cheap to run and expensive to have skipped: it is the one thing this
installation offers that a single, unreviewed model turn does not. A session
that produces working code with no PRD behind it and a session that produces
a PRD with no code behind it are the same failure wearing two different
disguises — both skip half of `workflow.md`, and there is no request whose
size decides which half.
