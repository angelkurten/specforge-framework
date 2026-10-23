## Evidence

- **Ran**:
  - Blind classification of the 9 cases in `tests/v2/classify_cases.md` by a clean-context agent given only `core/modes.md`, twice: once on the first draft, once after the fixes.
  - `node tools/cli/dist/src/cli.js doctor`.
- **Result**:
  - Pass 1: 9 of 9 modes matched; risk differed on 3 cases (6, 7, 9) and the agent reported 12 ambiguities. Fixed: an evaluation order for the modes, the Controlled flag as a third field that can be `unsure`, a size bound for Direct (at most 2 files), tunable values as low risk, PII read as reads/exports/stores, "every session" replaced by "a flow every user must pass through", and a rule for refactors with and without a stated scope.
  - Pass 2: 9 of 9 modes matched. Axis labels differed from the case table on 3 cases, none of which changed the mode: case 3 risk `unsure` (the table allows low or high), case 6 Controlled flag `unsure` (table: no), case 9 risk `unsure` (table: high).
  - doctor: 0 findings.
- **Not checked**:
  - Four ambiguities the second pass reported that could change a mode: whether the Controlled flag is `no` or `unsure` when nothing names a regime or a second team (cases 3 and 5), whether an unfamiliar internal data source makes uncertainty high (case 4), and whether an unspecified method (MFA) counts as several untried approaches (case 8). They are left open for a human decision, because the 3-iteration budget is spent.
  - The skill has not been run end to end in a live Claude Code session.
- **Deviations from the contract**: none.
