# Quickstart

A first change, step by step. The steps, in order: classify, contract, red, loop, review, compose. Skills run the steps and scripts check them; the details are below.

1. **Classify.** Describe the change to the agent. The `specforge-classify` skill rates risk and uncertainty and proposes a mode (see [Modes](concepts/modes.md)). You confirm or correct it. For Contract or Controlled it scaffolds `specforge/changes/<YYYY-MM-DD>-<slug>/` with a contract copied from `templates/contract.md`.
2. **Contract.** Fill in the contract: outcome, scope, context, constraints, premises and acceptance evidence. It fits on one screen. See [Contract](concepts/contract.md).
3. **Red.** The `specforge-loop` skill writes failing tests from the acceptance evidence. You read them, then lock them:

    ```
    python3 specforge/scripts/lock_tests.py approve <change> <test files>
    ```

    `lock_tests.py` records one hash per approved test in `locked-tests.txt`. Only your own message approves tests.
4. **Loop.** Run the implementer:

    ```
    python3 specforge/scripts/loop.py <change> --agent '<agent command>'
    ```

    `loop.py` runs one clean-context iteration per task, ticks `progress.md`, and stops on success, a `BLOCKED:` line, a changed locked test or an exhausted budget. See [Loop](concepts/loop.md).
5. **Review.** The `specforge-review` skill runs the mechanical checks and dispatches a reviewer with a clean context:

    ```
    python3 specforge/scripts/review_prep.py <change> --base <ref>
    ```

    `review_prep.py` reports what a pattern can catch; the reviewer reads for the rest. See [Review](concepts/review.md).
6. **Compose.** The `specforge-compose` skill turns each lesson into a test, rule, example, instruction or doc, recorded in `compose.md`:

    ```
    python3 specforge/scripts/compose_check.py <change>
    ```

    Then archive the finished change as the last commit before merge:

    ```
    python3 specforge/scripts/archive.py <change>
    ```

    See [Compose](concepts/compose.md).
