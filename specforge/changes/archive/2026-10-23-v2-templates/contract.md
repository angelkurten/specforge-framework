# v2 templates: contract, evidence report, decision log

**Mode**: Contract

## Outcome

An author can start any Contract-mode change from `templates/contract.md`, close it with `templates/evidence-report.md` in the PR, and record a decision with `templates/decision-log.md` in `DECISIONS.md`.

## Scope

In: the three templates, `DECISIONS.md` seeded with the decisions taken so far, and this contract as the first use of the template.
Out: removing v1 templates, rules or agents; the mode classifier; the loop; any CLI change. Each is its own change.

## Context

- `templates/prd.md`, `templates/adr.md`, `templates/agdr.md` — the v1 templates these replace later.
- The v2 brief's "Artefactos y plantillas" section, which fixes the section names of all three.

## Constraints

- The contract template fits on one screen: six sections, guidance in HTML comments.
- English, like the rest of the framework files.
- No v1 file is modified, so `main` and v1 adopters are untouched.

## Acceptance evidence

- Each template carries exactly the sections the brief names: `grep '^## ' templates/contract.md` lists Outcome, Scope, Context, Constraints, Acceptance evidence, Stop and escalate.
- The contract template is at most 60 lines: `wc -l templates/contract.md`.
- The templates are tried on 5 real changes before v1 templates are removed; this contract is change 1 of 5.

## Stop and escalate

Stop if a section name has to differ from the brief, or if a template needs more than one screen. Budget: one iteration — templates are text, no loop.
