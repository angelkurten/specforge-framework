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

- [x] scripts/premise_challenge_fix_test.py test_8_a_mention_before_the_heading_does_not_hide_the_real_premises
- [x] scripts/premise_challenge_fix_test.py test_9_a_mention_without_the_heading_does_not_start
- [x] scripts/premise_challenge_fix_test.py test_10_a_heading_with_no_bullet_does_not_start
- [x] scripts/premise_challenge_fix_test.py test_11_only_none_with_a_reason_counts_as_no_premise
- [x] scripts/premise_challenge_fix_test.py test_12_the_template_says_a_premise_fits_on_one_line
- [x] Add premise_challenge_fix_test to the suite list in .github/workflows/v2-ci.yml, and every suite there passes, and `loop.py` on this change's own contract gets past the premise check

Third round after the second review (PASS with a should-fix: `→ holds` is read without its backticked command; other bullet shapes slip past):

- [ ] scripts/premise_challenge_fix2_test.py test_13_a_result_needs_a_backticked_command_right_before_it
- [ ] scripts/premise_challenge_fix2_test.py test_15_a_bullet_in_another_shape_does_not_slip_past
- [ ] scripts/premise_challenge_fix2_test.py test_14 and test_16 (pass today; must still pass)
- [ ] scripts/premise_challenge_fix2_test.py test_17_a_failing_agent_with_no_stderr_prints_no_blank_line
- [ ] scripts/premise_challenge_fix2_test.py test_18_the_docstring_names_the_premise_refusal
- [ ] Add premise_challenge_fix2_test to the suite list in .github/workflows/v2-ci.yml, every suite there passes, and `loop.py` on this change's own contract gets past the premise check

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
- test_8: `loop.py` busca `## Premises` solo al inicio de línea (regex `^## Premises`, multilínea); `premise_challenge_fix_test.py test_8` → OK, `premise_challenge_test.py` → 7 tests OK.
- test_9: sin cambios de código (el regex `^## Premises` de test_8 ya lo cubre); `python3 scripts/premise_challenge_fix_test.py PremiseChallengeFixTests.test_9_a_mention_without_the_heading_does_not_start` → OK; siguen fallando 10, 11 y 12 (tareas siguientes).
- test_10: `loop.py` rechaza (exit 2) un `## Premises` sin ninguna viñeta `- `; `python3 scripts/premise_challenge_fix_test.py` → test_10 OK, fallan 11 y 12 (tareas siguientes); `premise_challenge_test.py` → OK.
- test_11: `loop.py` solo acepta `- none — <motivo>` (regex `- none — \S`) como sin premisa; `python3 scripts/premise_challenge_fix_test.py` → 4 OK, solo falla test_12 (tarea siguiente); `premise_challenge_test.py` → 7 tests OK.
- test_12: la plantilla templates/contract.md dice que cada premisa cabe en una línea; `python3 scripts/premise_challenge_fix_test.py` → 5 tests OK.
- ci2: añadí premise_challenge_fix_test a la lista de v2-ci.yml; las 21 suites de la lista con `python3 scripts/<suite>.py` → todas OK; `loop.py <este cambio> --agent true --max-iterations 1` → pasa la comprobación de premisas (sale 3 por presupuesto, no 2).
