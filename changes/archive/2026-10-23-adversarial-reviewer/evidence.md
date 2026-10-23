## Evidence

- **Ran**:
  - `python3 scripts/review_test.py` before implementation: 8 of 8 failed (red). A human approved them, and they were locked with `scripts/lock_tests.py approve`.
  - `python3 scripts/review_test.py` after implementation: 8 of 8 pass on the first green iteration. `lock_tests.py check` exits 0 for both this change and the execution loop.
  - `pnpm test` in `tools/cli`: 504 of 504 pass. `node tools/cli/dist/src/cli.js doctor`: 0 findings. `python3 scripts/loop_test.py`: 11 of 11 pass.
  - Manual case 1 in `tests/v2/review_cases.md`, against a throwaway repository. `review_prep.py` exited 0 with no findings. The reviewer returned `VERDICT: BLOCK` with blockers at all four seeded defects: `src/cart.py:8` scope creep, `tests/test_cart.py:9` trivial test, scenario 3 at `src/cart.py:5` and `tests/test_cart.py:1`, and the false evidence at `changes/demo/evidence.md:5`. It also raised an unrecorded deviation (`evidence.md:6`) and one should-fix.
- **Result**: pass.
- **Not checked**:
  - The `specforge-reviewer` definition itself was not dispatched. A new agent registers only after a session restart, so manual case 1 ran on a general-purpose agent carrying the definition's body word for word. Its `tools:` restriction was therefore enforced by the brief, not by the host.
  - The reviewer could not re-run the seeded case's tests, because pytest is not installed in that environment. It said so under CHECKED.
  - `review_prep.py` on an empty range (base equals HEAD) exits 0 with no changed files and no warning. Found while building manual case 1, and left for a follow-up.
  - The Controlled-mode security checklist was not exercised.
  - Run on this change itself (`review_prep.py … --base HEAD~1`), the script exits 1 with 15 findings, all false positives. Skip and stub markers are matched inside markdown (this contract, `tests/v2/review_cases.md`), inside the script's own regexes and inside its test fixtures. Three v1 CLI tests renamed from "fourteen" to "fifteen" are reported as removed. Left open for a human decision on how to narrow the patterns.
- **Deviations from the contract**:
  - The stop condition fired: the new definition broke v1 CLI tests that count roles. A human chose to update the counts.
  - The same run showed that the first v2 commits had already broken 2 CLI tests (bundle file counts), unnoticed because only `doctor` was run. This change updates `tools/cli/tests/` (bundle count 36→41, manifest 35→40, definitions 14→15, and the three READMEs' deny snippets and counts), and excludes `specforge-reviewer` from the v1 `REVIEWERS` group.
  - `core/`, the v2 scripts, the hook and the skills are not in the CLI bundle; `init` does not install them yet.
