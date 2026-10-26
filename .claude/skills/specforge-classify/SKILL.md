---
name: specforge-classify
description: Classify a requested change on risk and uncertainty, propose a specforge mode (Direct, Contract, Explore, Controlled), and scaffold the change folder once a human confirms. Use at the start of every change, before reading code to implement or writing a contract.
---

# Classify a change

1. Read `specforge/core/modes.md`. It is the whole rule; this skill only runs it.
2. Read the request, and enough of the code it names to check each signal. Do not start implementing.
3. Print the `MODE PROPOSAL` block from `specforge/core/modes.md` § Proposal: one line per axis and one for the Controlled flag, each naming the signal behind it, then the mode. Write `unsure` and what you would need when a field cannot be decided.
4. Ask the human to confirm or correct the mode, as a single question with the four modes as options and your proposal first. Wait for the answer.
   - With no human in the session, use the mode with every `unsure` field resolved to high and to yes, and continue; record the proposal as unconfirmed in step 5.
5. On Contract or Controlled, create `specforge/changes/<YYYY-MM-DD>-<slug>/contract.md` from `templates/contract.md`, with the `Mode` line filled in. On Direct, create no folder, but the change lands with an edge test: at least one test of a bound, an empty input or a control-character input of what it changes. On Explore, create nothing until the prototype has answered its question.
