# Progress

**Budget**: 9 iterations, 3 USD

## Tasks

- [x] scripts/v2_adjustments_test.py test_1_review_states_an_edge_checklist_for_every_contract
- [x] scripts/v2_adjustments_test.py test_2_the_direct_row_names_an_edge_test
- [x] scripts/v2_adjustments_test.py test_3_modes_describes_the_optional_design_panel
- [x] scripts/v2_adjustments_test.py test_4_classify_says_direct_lands_with_an_edge_test
- [x] scripts/v2_adjustments_test.py test_5_decisions_records_v2_as_the_default
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Tarea 1: añadí el edge checklist a specforge/core/review.md; `python3 scripts/v2_adjustments_test.py V2AdjustmentsTests.test_1_review_states_an_edge_checklist_for_every_contract` → OK (los tests 2-5 siguen rojos, como se espera).
- Tarea 2: la fila Direct de specforge/core/modes.md ahora nombra un test de borde; `python3 scripts/v2_adjustments_test.py V2AdjustmentsTests.test_2_the_direct_row_names_an_edge_test` → OK.
- Tarea 3: añadí la sección Design panel a specforge/core/modes.md; `python3 scripts/v2_adjustments_test.py V2AdjustmentsTests.test_3_modes_describes_the_optional_design_panel` → OK.
- Lead: BLOCKED resolved by the human — the loop agent is granted `Edit(.claude/skills/**)` and `Write(.claude/skills/**)` through `--allowedTools` for this change (Claude Code protects `.claude/` under acceptEdits). First run: 4 iterations, 1.20 USD (ledger).
- Lead: the relative `Edit(.claude/skills/**)` rule did not match (iteration 5 blocked again); retrying with the absolute form `//Users/angelkurten/specforge/.claude/skills/**`.
- Lead: loop.py refused to start (2 iterations left for 3 tasks); the human raised `**Budget**:` to 9 iterations, 3 USD.
- Lead: neither the relative nor the absolute `Edit` rule lifted Claude Code's protection of `.claude/` under acceptEdits (iteration 6 blocked again). As agreed with the human, the lead wrote step 5 of the classify skill by hand (deviation: code outside the loop); task 4's test now passes and the agent ticks it.
- Tarea 4: `python3 scripts/v2_adjustments_test.py V2AdjustmentsTests.test_4_classify_says_direct_lands_with_an_edge_test` → OK (el paso 5 del skill ya estaba escrito por el lead).
- Tarea 5: añadí la entrada 2026-10-25 a DECISIONS.md; `python3 scripts/v2_adjustments_test.py V2AdjustmentsTests.test_5_decisions_records_v2_as_the_default` → OK.
- Lead: the loop stopped at its cap (9 iterations, 2.09 USD) with only the full-suite task open; the lead ran every v2-ci.yml suite: all pass. Task left unticked for the agent; review, evidence and archive still to do.
