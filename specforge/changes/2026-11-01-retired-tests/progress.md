# Progress

**Budget**: 11 iterations, 4 USD, cumulative (raised by the human for the fix round)

## Tasks

- [x] scripts/retired_tests_test.py test_1_a_declared_deleted_file_is_should_fix_and_an_undeclared_one_a_blocker
- [x] scripts/retired_tests_test.py test_2_a_declared_function_is_retired_and_an_undeclared_sibling_function_still_blocks
- [x] scripts/retired_tests_test.py test_3_a_bullet_without_a_reason_retires_nothing (already passes: keep it passing)
- [x] scripts/retired_tests_test.py test_4_a_declared_entry_the_range_does_not_delete_is_a_nit
- [x] scripts/retired_tests_test.py test_5_a_sibling_test_is_retired_as_the_packet_prints_it
- [x] scripts/retired_tests_test.py test_6_the_template_and_review_md_name_the_section
- [x] `retired_tests_test` is in `.github/workflows/v2-ci.yml`
- [x] every suite listed in `.github/workflows/v2-ci.yml` passes
- [ ] scripts/retired_tests_fix_test.py test_7 and test_9 (read the contract with `git show HEAD:<contract>`; drop `<!-- -->` comments before reading bullets)
- [ ] scripts/retired_tests_fix_test.py test_8 (flag an entry absent from the contract's first version in the range: the base's, or else the first commit in the range holding it) and test_10 (already passes: keep it passing)
- [ ] scripts/retired_tests_fix_test.py test_11 (the template's Retired tests comment names the exact bullet form); add `retired_tests_fix_test` to `.github/workflows/v2-ci.yml`; every suite there passes

## Blocked

## Log
- Tarea 1: añadí `retired_tests()` y el should-fix para archivo borrado en review_prep.py; `python3 scripts/retired_tests_test.py Retired.test_1_…` → ok; `scripts/review_test.py` → 8 tests OK.
- Tarea 2: en review_prep.py, función eliminada declarada como `path::nombre` o archivo completo → should-fix `retired by the contract`; `python3 scripts/retired_tests_test.py Retired.test_2_…` → ok; `scripts/review_test.py` → OK.
- Tarea 3: `python3 scripts/retired_tests_test.py Retired.test_3_…` → OK (1 test); `scripts/review_test.py` → 8 tests OK. Sin cambios de código: ya pasaba.
- Tarea 4: en review_prep.py, `review()` registra las entradas usadas y emite `nit: … retired test not deleted in the range: <entry>` para las no usadas; `python3 scripts/retired_tests_test.py Retired` → 4 tests OK; `scripts/review_test.py` → 8 tests OK.
- Tarea 5: `python3 scripts/retired_tests_test.py RetiredSibling` → test_5 ok (ya pasaba, sin cambios de código; solo falla test_6, tarea siguiente).
- Tarea 6: añadí `## Retired tests` a templates/contract.md y la frase en specforge/core/review.md (§ Two halves y § Lock changes); `python3 scripts/retired_tests_test.py` → 6 tests OK.
- Tarea 7: añadí `retired_tests_test` a la lista de suites en .github/workflows/v2-ci.yml; `grep -c retired_tests_test .github/workflows/v2-ci.yml` → 1.
- Tarea 8: ejecuté las 50 suites de `v2-ci.yml` (`python3 scripts/<suite>.py` en bucle); todas con código de salida 0, ningún fallo.
