---
name: specforge-review
description: Review a finished specforge change adversarially — run the mechanical checks, then dispatch the specforge-reviewer agent with a clean context, and report its verdict. Use after the loop exits 0 and before the change is merged.
---

# Review a change

1. Run `python3 scripts/review_prep.py <change> --base <ref the branch started from>`. Keep its full output: that is the packet.
2. Dispatch the `specforge-reviewer` agent with the packet, the change folder and the mode from the contract's `Mode` line. Do not add your own opinion of the change to the brief.
3. Report the reviewer's `VERDICT` line and every blocker to the human verbatim. A BLOCK goes back to the loop or to the human, never past it.
4. Before calling the change done, read the CI result for the pushed head commit. A red or missing run is a blocker, whatever the local runs said.
