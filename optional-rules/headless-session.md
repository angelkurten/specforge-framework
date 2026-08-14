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
| **Step 8 — post-merge** | Option (a): proceed to step 9 with the PRD just merged. `workflow.md` asks this on every ship, not only on an ambiguity, so it is the one decision point a headless session reaches every time. |
| **Step 9 — escalation** | Option (ii): move the PRD back to `Draft`, strip the gate fields, explain why at the top, and stop. Never option (iii) — waiving a finding is a human act, and a session with no human cannot perform it on one's behalf. |
| **Environment** | Do not read this session's own process environment — `env`, `printenv`, `process.env`, `os.environ`, `/proc/self/environ`, an exported shell variable — into any file the session writes or commits. A PRD's § 8 asks about auth, secrets and PII, which is the one prompt that makes transcribing a live credential look like grounding. Name the secrets a design depends on; never quote the values this process holds. |

The last row is not a `workflow.md` gap. It is here because the same absence
of a user that produced the other six also means nothing reviews what the
session writes before it is committed.
