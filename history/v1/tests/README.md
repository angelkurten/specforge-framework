# Test corpus

These 44 files are the test plans referenced by PRD-001 § 9, PRD-002 § 9 and PRD-012 § 9. The 42 from PRD-001 and PRD-002 are named in both PRDs' gate `tests:` lists; both PRDs are `Implemented` and frozen, so **those paths must keep resolving** — files here are not renamed or moved. The two under `workflow/` are PRD-012's and are the first fixtures in this corpus that no `Implemented` PRD references.

They are not one kind of thing, and treating them as one is what made the corpus look uniformly broken. Three categories:

| Category | Count | Runs where |
|---|---|---|
| **Ported** — assertions over framework-file content | 13 | `tools/cli/tests/conformance/framework.test.ts`, on every push and PR |
| **Mechanizable, not yet ported** — same shape, no automation written yet | 13 | nowhere yet |
| **Manual** — needs an agent in the loop | 18 | by hand |

## Manual files carry a marker

Every file in the third category declares it in its header:

```markdown
**Execution**: manual — needs an agent in the loop (lead agent, generator, or critic).
```

These assert on agent *behaviour* — "submit resolution A to the lead agent", "the critic returns 🔴", "the lead agent rejects with a message referencing the carve-out". No unit test can stand in for that. They are procedures to execute against a live session, and the checkbox criteria are the record of having done so.

Six of them also carry a `**Partial automation**` line pointing at a doctor validator that now covers the *detection* half of what they describe. When PRD-001 was written, that detection lived only in a briefing; `roadmap-pii` and `roadmap-evidence-categories` moved it into code. What stays manual is the agent behaviour around the finding — for example, `roadmap-pii` detects an email in a category-4 quote, but only a live session can verify the lead agent refuses a `refute` resolution on it.

## Ported files

A ported file keeps its prose as the human-readable statement of intent; the executable form lives in `framework.test.ts`, where each `describe()` block names its source file. The two halves are meant to be read together — if you change one, change the other.

Porting did **not** move or rename anything, precisely because of the frozen-PRD constraint above.

## Adding to this corpus

A new test plan row in a PRD § 9 gets a file here. Decide its category first:

- Does it assert on the content of a file in the repo? Write the `.md`, then port it in the same change. Do not leave it unexecuted.
- Does it need a live agent? Write the `.md` with the `**Execution**: manual` marker.

Fixture paths are **relative to the specforge repo root**. Absolute paths pinned to one machine's home directory made 13 of these unrunnable even by hand.
