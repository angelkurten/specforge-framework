# Progress

**Budget**: 9 iterations, 3 USD

## Tasks

- [x] scripts/invisible_chars_test.py test_1_a_literal_rlo_in_code_is_should_fix_and_exits_0 (introduces the finding over `added_lines`)
- [x] scripts/invisible_chars_test.py test_2_prose_is_checked_too
- [x] scripts/invisible_chars_test.py test_3_other_format_characters_name_their_code_point
- [x] scripts/invisible_chars_test.py test_4_zwj_and_zwnj_are_not_reported (passes today; must still pass)
- [x] scripts/invisible_chars_test.py test_5_an_escape_is_not_reported (passes today; must still pass)
- [x] scripts/invisible_chars_test.py test_6_a_line_separator_is_reported
- [x] scripts/invisible_chars_test.py test_7_the_docstring_names_the_finding
- [x] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Task 1: added `invisible_points` and a loop over `added_lines` in review_prep.py; `python3 scripts/invisible_chars_test.py` → 5 of 7 pass (test_1 included, 2/3/4/5 too); test_6 and test_7 still fail, as expected.
- Task 2: nada que cambiar, `added_lines` ya incluye prosa; `python3 scripts/invisible_chars_test.py -k test_2` → OK (1 test).
- Task 3: nada que cambiar, `invisible_points` ya nombra cada punto; `python3 scripts/invisible_chars_test.py InvisibleCharTests.test_3_other_format_characters_name_their_code_point` → OK (1 test).
- Task 4: nada que cambiar, `invisible_points` exime U+200C/U+200D; `python3 scripts/invisible_chars_test.py InvisibleCharTests.test_4_zwj_and_zwnj_are_not_reported` → OK (1 test).
- Task 5: nada que cambiar, un escape literal no es un carácter `Cf`; `python3 scripts/invisible_chars_test.py InvisibleCharTests.test_5_an_escape_is_not_reported` → OK (1 test).
- Task 6: `added_lines` usaba `splitlines()`, que parte el diff en U+2028 y perdía la línea; cambiado a `split("\n")`; `python3 scripts/invisible_chars_test.py` → 6 de 7 pasan (test_6 OK), solo falla test_7, como se espera.
- Task 7: docstring de review_prep.py ahora nombra el should-fix "invisible character"; `python3 scripts/invisible_chars_test.py` → Ran 7 tests, OK.
- Task 8: corrí las 26 suites de v2-ci.yml con `python3 scripts/<suite>.py` en el orden del workflow → todas terminan en `OK`, ninguna falla.
