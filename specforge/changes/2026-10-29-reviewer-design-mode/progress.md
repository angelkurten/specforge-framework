# Progress

**Budget**: 12 iterations, 4 USD, cumulative (raised by the human for the fix round)

## Tasks

- [x] scripts/design_mode_test.py test_1_review_md_has_a_design_mode_section
- [x] scripts/design_mode_test.py test_2_each_perspective_names_its_focus
- [x] scripts/design_mode_test.py test_3_the_reviewer_definition_names_design_mode (the lead edits `.claude/`: write BLOCKED with the text you need there if you cannot)
- [x] scripts/design_mode_test.py test_4_modes_dispatches_the_reviewer_not_v1_agents
- [x] scripts/design_mode_test.py test_5_the_guide_names_the_design_mode
- [x] scripts/design_mode_test.py test_6_decisions_records_the_design_mode_and_the_five_changes
- [x] scripts/v2_adjustments_test.py passes (test_3 already edited by the lead; do not edit it)
- [x] `design_mode_test` is in `.github/workflows/v2-ci.yml`, and every suite listed there passes
- [ ] scripts/design_mode_fix_test.py test_7 and test_10 (modes.md and review.md: the `Contract:` field; what CHECKED lists)
- [ ] scripts/design_mode_fix_test.py test_8 (the reviewer's step 3, written by the lead; just confirm it passes) and test_9 (review.md's opening paragraph)
- [ ] `design_mode_fix_test` is in `.github/workflows/v2-ci.yml`, and every suite listed there passes

## Blocked

## Log
- Task 1: añadí `## Design mode` a specforge/core/review.md (con las tres perspectivas); `python3 scripts/design_mode_test.py DesignModeTests.test_1_...` → OK.
- Task 2: `python3 scripts/design_mode_test.py DesignModeTests.test_2_each_perspective_names_its_focus` → OK (ya lo cubría la sección de la tarea 1; sin cambios de código).
- Task 3: la definición del reviewer ya la editó el lead (9f197ec); `python3 scripts/design_mode_test.py DesignModeTests.test_3_the_reviewer_definition_names_design_mode` → OK; sin cambios de código.
- Task 4: reescribí `## Design panel` en specforge/core/modes.md para despachar `specforge-reviewer` con `Mode: design`; `python3 scripts/design_mode_test.py DesignModeTests.test_4_...` → OK.
- Task 5: en docs/migration-v1-to-v2.md la línea del design panel ahora nombra `Mode: design`; `design_mode_test` test_5 → OK y `migration_guide_fix_test.py` → OK.
- Task 6: añadí la entrada de DECISIONS.md (Mode: design + cinco cambios); `python3 scripts/design_mode_test.py` → OK.
- Task 7: `python3 scripts/v2_adjustments_test.py` → 5 tests OK; sin cambios de código.
- Task 8: añadí `design_mode_test` a .github/workflows/v2-ci.yml; las 48 suites de v2-ci corrieron con `python3 scripts/<suite>.py` → todas OK, sin FAIL.
