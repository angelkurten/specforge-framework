# Paired headless run — PRD-024 §9 rows 60 and 65

Six captured `stream-json` cells, run against **Claude Code 2.1.233** — the
version `build_sandbox_recipe.py` pins — with the framework corpus at
`0.23.0` mounted from the working tree and kubbo's real `SESSION_PREAMBLE`
rendered from `sandbox-harness/executor.py`. `--strict-mcp-config` held the
tool list as the controlled variable.

Each cell pairs a **present** and an **absent** arm: the same request, the
same corpus, four `request_approval` MCP servers registered or none.

| File | Gap | Tools | Checkpoint called |
|---|---|---|---|
| `1-present.json` | step 1 | 4 | `scope_ambiguity`, then `tradeoff_resolution` at step 6 |
| `1-absent.json` | step 1 | 0 | none — the session applied the headless defaults and said so |
| `8-present-a.json` | step 8 | 4 | `prd_ready_for_approval` |
| `8-absent.json` | step 8 | 0 | `prd_ready_for_approval`, refused by the CLI as unavailable |
| `9-present.json` | step 9 | 4 | `fix_round_escalation` |
| `9-seeded.json` | step 9 | 4 | `fix_round_escalation`, against a seeded implementation |

Every call was **alone in its turn**, which is a pass criterion rather than a
detail: a batched call cannot pause the session.

## What these are, and what they are not

**Reduced.** The raw captures total 5.7 MB. Each file here keeps the root
`system/init` (its `tools` filtered to the `request_approval` members), the
`assistant` turns carrying a checkpoint `tool_use`, the `assistant` text that
records a headless disposition, and the root `result`. Everything else is
dropped. Sub-agent `init` and `result` events are dropped too — a session that
dispatches agents emits one of each per agent into the forwarded stream, and
`1-absent`'s raw capture carries eight of each.

**Scrubbed.** Absolute paths, usernames, and session UUIDs are replaced. This
repository is public.

**Three were captured while their session was still running** —
`1-present`, `8-present-a`, `8-absent` carry no `result` event. The evidence
these rows assert on is the call and its turn shape, which is present; the
missing `result` is recorded here rather than hidden.

**The step-8 and step-9 gaps needed their decision point seeded.** Four
earlier cells returned `not run` rather than a measured zero because no
session reached those gaps unaided. What these capture is that the clause
fires once the session is there — not that a session gets there on its own.
