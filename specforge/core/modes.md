# Modes

Every change is classified on two axes before work starts, and the classification picks the mode. **Risk** decides how much verification the change needs. **Uncertainty** decides whether to explore before fixing intent. They are separate axes: a well-understood migration is high risk and low uncertainty; a UX experiment is the reverse.

## Risk

Risk is **high** when the change does any of the following, and **low** otherwise:

| Signal | Example |
|---|---|
| Changes a schema, runs a migration or backfill, or deletes data | a new column with a backfill |
| Touches authentication, authorization, secrets or payments, or reads, exports, stores or alters PII | a new permission check, a report export with email addresses |
| Changes a public contract other code or users depend on: an API, a file format, a document sent to users | an API response field renamed, an invoice layout |
| Is hard to revert as a unit | a one-way data transform, an email or payment that cannot be recalled |
| Changes a flow every user must pass through | login, signup, checkout |

A tunable value whose effect reverts when the value does (a retry count, a timeout, a page size) is low risk on this axis, even though it changes runtime behaviour.

## Uncertainty

Uncertainty is **high** when any of the following holds, and **low** otherwise:

| Signal | Example |
|---|---|
| The outcome cannot yet be written as observable acceptance scenarios | "make onboarding feel faster" |
| More than one approach is plausible and nobody knows which works | two candidate libraries, untried |
| The change depends on behaviour nobody has observed yet | a third-party API not called before, a data source nobody has queried |

An unspecified method with known, proven options (MFA by TOTP, SMS or passkeys) is **not** "nobody knows which works": the choice is made in the contract's Constraints or in `specforge/DECISIONS.md`. It counts only when nobody knows whether any option works for this case.

A data source counts as "nobody has queried" only when no code in the repository reads it yet; the agent checks by searching the code. An internal source the code already reads is low uncertainty, even if this change reads it for a new purpose.

A behaviour-preserving refactor is **low** uncertainty when its scope is stated: its outcome is that the existing tests still pass. A request with no stated scope ("clean up the billing module") is `unsure` until a one-sentence scope is given.

## Controlled flag

A third field, decided apart from the two axes: the change is **regulated** (subject to an external compliance regime the team names, such as PCI DSS, HIPAA or SOX) or **crosses teams** (needs code or approval from more than one team). Either makes the flag **yes**. When neither the request nor the code names a regime or a second team, the flag is **no**, not `unsure`: Controlled is for changes someone has said are regulated or shared. It is `unsure` only when a regime or a second team is mentioned but its reach is unclear.

## Mode

Evaluate the rows in this order and take the **first** that matches:

| Order | Mode | When | Artifacts |
|---|---|---|---|
| 1 | **Explore** | High uncertainty, at any risk | throwaway prototype, then a contract; the prototype is never merged |
| 2 | **Controlled** | High risk, and the Controlled flag is yes | contract + evidence + decisions + approvals |
| 3 | **Direct** | Low risk and trivial: at most 2 files, and no behaviour beyond what one sentence states | one test of an edge of the change (a bound, an empty or control-character input) |
| 4 | **Contract** | Everything else | contract + evidence report |

Explore comes first because a change nobody can yet describe cannot be verified at any level of rigour; Controlled applies when it re-classifies.

An Explore change re-classifies once the prototype has answered its question; at that point it is usually Contract or Controlled.

## Proposal

The agent proposes; a human confirms or corrects. The proposal names the signal behind each axis, so a correction can say which signal was wrong:

```
MODE PROPOSAL
Risk: high — changes a public contract (GET /orders drops `total`)
Uncertainty: low — outcome written as 3 scenarios
Controlled flag: no — one team, no named regime
Mode: Contract
```

- A field the agent cannot decide from the request and the code is reported as `unsure`, with what it would need to decide.
- When any field is `unsure`, the `Mode` line gives the mode with every `unsure` field resolved to high and to yes, and says so.
- **With no human to confirm**, that resolved mode is the one used, and the contract records the proposal as unconfirmed under its `Mode` line.
- On confirmation of Contract or Controlled, the change gets a folder `specforge/changes/<YYYY-MM-DD>-<slug>/` with a contract copied from `templates/contract.md`. Direct gets nothing; Explore gets its contract after the prototype.

## Design panel

Optional. For a Contract or Controlled change with high risk that touches design (schema, migration, an invariant across routes), the lead may dispatch v1's draft reviewers on the contract before Red: `specforge-backend-reviewer`, `specforge-security-reviewer` and `specforge-quality-reviewer`, each with `REVIEW_MODE: draft` and `PRD_PATH` set to the contract. Their findings go into the contract.
