---
name: specforge-review
description: Review a finished specforge change adversarially — run the mechanical checks, then dispatch the specforge-reviewer agent with a clean context, and report its verdict. Use after the loop exits 0 and before the change is merged.
---

# Review a change

1. If you can already name a way the diff breaks its contract, it is a fix round, not a review: write the failing test and run the loop again first (change 2026-10-25-ledger-hardlink). Then run `python3 specforge/scripts/review_prep.py <change> --base <ref the branch started from>`. When the contract names a code sibling, add `--repo ../<sibling> --repo-base <ref the sibling's branch started from>` so the packet covers the sibling's diff too (change 2026-10-26-sibling-repos). Keep its full output: that is the packet.
2. Dispatch the `specforge-reviewer` agent with the packet, the change folder and the mode from the contract's `Mode` line. Do not add your own opinion of the change to the brief.
3. Report the reviewer's `VERDICT` line and every blocker to the human verbatim. A BLOCK goes back to the loop or to the human, never past it.
4. Before calling the change done, read the CI result for the pushed head commit. A red or missing run is a blocker, whatever the local runs said. The evidence's CI field names a run ID that exists for that exact SHA (`gh run list --commit <sha>`). Pushing several commits at once runs only the tip, and a commit made after the last run (evidence, docs) needs its own run (change 2026-10-25-loop-budget, blocked twice on this).
