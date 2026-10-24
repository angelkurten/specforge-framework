# Progress

**Budget**: 10 iterations, 5 USD

## Tasks

- [x] scripts/premise_challenge_test.py test_1_the_template_has_a_premises_section
- [x] scripts/premise_challenge_test.py test_6_the_loop_rule_lists_challenge_before_red
- [x] scripts/premise_challenge_test.py test_2_no_premises_section_does_not_start, and in the same iteration migrate the fixtures the contract's Constraints name (loop_test.py, archive_test.py, archive_fix_test.py, reapprove_*) to a contract with `- none`, so every suite in v2-ci.yml still passes
- [x] scripts/premise_challenge_test.py test_3_an_unchecked_premise_does_not_start
- [x] scripts/premise_challenge_test.py test_4_a_failed_premise_does_not_start_and_says_reclassify
- [x] scripts/premise_challenge_test.py test_5_checked_premises_start_the_loop (passes today; must still pass)
- [x] scripts/premise_challenge_test.py test_7_a_failing_agent_shows_its_stderr
- [x] Add premise_challenge_test to the suite list in .github/workflows/v2-ci.yml, and every suite there passes

Fix round after review (VERDICT: BLOCK — `## Premises` is found by substring, so a mention in prose hides the section; an empty section and a loose `- none` start the loop):

- [ ] scripts/premise_challenge_fix_test.py test_8_a_mention_before_the_heading_does_not_hide_the_real_premises
- [ ] scripts/premise_challenge_fix_test.py test_9_a_mention_without_the_heading_does_not_start
- [ ] scripts/premise_challenge_fix_test.py test_10_a_heading_with_no_bullet_does_not_start
- [ ] scripts/premise_challenge_fix_test.py test_11_only_none_with_a_reason_counts_as_no_premise
- [ ] scripts/premise_challenge_fix_test.py test_12_the_template_says_a_premise_fits_on_one_line
- [ ] Add premise_challenge_fix_test to the suite list in .github/workflows/v2-ci.yml, and every suite there passes, and `loop.py` on this change's own contract gets past the premise check

## Blocked

## Log
- test_1: añadí `## Premises` a templates/contract.md; `python3 scripts/premise_challenge_test.py PremiseChallengeTests.test_1_the_template_has_a_premises_section` → OK.
- test_6: añadí la fase **Challenge.** antes de **Red.** en specforge/core/loop.md; `python3 scripts/premise_challenge_test.py PremiseChallengeTests.test_6_the_loop_rule_lists_challenge_before_red` → OK.
- test_2: `loop.py` `run()` rechaza (exit 2) un contrato sin `## Premises`, tras los chequeos de lock; migré los fixtures (`archive_test.py`, `loop_test.py`) a `- none`; las 19 suites de v2-ci.yml → OK; `premise_challenge_test.py` → solo fallan 3, 4 y 7 (tareas siguientes).
- test_3: `loop.py` `run()` rechaza (exit 2) una premisa sin `→ holds`/`→ fails:`, citándola; `premise_challenge_test.py test_3` → OK; las suites de v2-ci.yml siguen en verde, y solo fallan 4 y 7 (tareas siguientes).
- test_4: `loop.py` `run()` rechaza (exit 2) una premisa `→ fails:` diciendo que se reclasifique; `premise_challenge_test.py` → pasan 1-6, solo falla 7 (tarea siguiente).
- test_5: sin cambios de código; `python3 scripts/premise_challenge_test.py` → pasan 1-6, solo falla 7 (tarea siguiente).
- test_7: `loop.py` imprime los últimos 500 caracteres del stderr del agente cuando sale con código distinto de cero; `python3 scripts/premise_challenge_test.py` → 7 tests OK.
- ci: añadí premise_challenge_test a la lista de v2-ci.yml; corrí las 20 suites de la lista con `python3 scripts/<suite>.py` → todas OK (exit 0).
