#!/usr/bin/env python3
"""Run an agent on a change, one clean-context process per iteration.

    python3 specforge/scripts/loop.py specforge/changes/<change>
    python3 specforge/scripts/loop.py specforge/changes/<change> --agent "claude -p --output-format json"

Each iteration starts a fresh agent process with the same prompt: read the
contract and progress.md, take the next unticked task, tick it, log it, exit.
State lives on disk, never in the agent's history. After every iteration the
loop checks, in this order, and stops on the first that holds:

    exit 4  an approved test changed        (specforge/scripts/lock_tests.py check),
            or the change folder moved      (specforge/scripts/archive.py mid-run)
    exit 5  the agent wrote a BLOCKED: line  (progress.md § Blocked)
    exit 0  every task is ticked
    exit 3  the cost cap is passed           (summed total_cost_usd)
    exit 2  3 iterations without a new ticked task
    exit 3  the iteration cap is reached

The budget comes from progress.md's `**Budget**:` line, e.g.
`10 iterations, 5 USD`; --max-iterations and --max-cost override it. Cost is
counted only when the agent prints JSON carrying `total_cost_usd`, as
`claude -p --output-format json` does. The agent command is run from the
working directory, with SPECFORGE_CHANGE_DIR and SPECFORGE_ITERATION set and
the prompt as its last argument.

Python 3 standard library only.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lock_tests import LOCK_FILE, UNLOCKED, MalformedLock, digest, read_lock  # noqa: E402

NO_PROGRESS_LIMIT = 3
DEFAULT_AGENT = "claude -p --output-format json"

PROMPT = """\
You are one iteration of the specforge loop for the change in {change}.
Read {change}/contract.md and {change}/progress.md. Do not rely on anything
else from earlier iterations: the files are the whole state.
Take the first unticked task in progress.md § Tasks and do only that task.
When it is verifiably done, tick it and add one line to § Log saying what you
ran and what it returned. Tests listed in {change}/locked-tests.txt were
approved by a human: never edit them. If a task cannot be done without
changing a locked test or contradicting the contract, write one line starting
with BLOCKED: under § Blocked, say why, and stop. Then exit."""


def parse_budget(progress: str) -> tuple[int | None, float | None]:
    match = re.search(r"^\*\*Budget\*\*:\s*(.*)$", progress, re.MULTILINE)
    if not match:
        return None, None
    line = match.group(1)
    iterations = re.search(r"(\d+)\s*iterations?", line)
    cost = re.search(r"(\d+(?:\.\d+)?)\s*USD", line)
    return (
        int(iterations.group(1)) if iterations else None,
        float(cost.group(1)) if cost else None,
    )


def ticked(progress: str) -> tuple[int, int]:
    """Return (ticked, total) over the task checkboxes."""
    boxes = re.findall(r"^\s*- \[([ xX])\]", progress, re.MULTILINE)
    return sum(b.lower() == "x" for b in boxes), len(boxes)


def blocked(progress: str) -> str | None:
    match = re.search(r"^BLOCKED:\s*(.*)$", progress, re.MULTILINE)
    return match.group(1) if match else None


def cost_of(stdout: str) -> float:
    try:
        return float(json.loads(stdout).get("total_cost_usd") or 0)
    except (ValueError, AttributeError):
        return 0.0


def stop(code: int, reason: str) -> int:
    print(f"loop: stopped — {reason}")
    return code


def run(change: Path, agent: str, max_iterations: int | None, max_cost: float | None) -> int:
    progress_file = change / "progress.md"
    root = Path.cwd()
    done_before, _ = ticked(progress_file.read_text())
    # The approved hashes as they stood before the first iteration. Checked
    # against these, not the lock file on disk, so neither moving the folder
    # nor rewriting the lock hides an edited test.
    try:
        approved = read_lock(change)
    except MalformedLock as e:
        return stop(4, f"malformed lock line {e}")
    unlocked = [path for path, sha in approved.items() if sha == UNLOCKED]
    if unlocked:
        # Never hand the agent a test a human opened for re-approval.
        return stop(4, f"locked test unlocked, awaiting re-approval: {', '.join(unlocked)}")
    lock_file = change / LOCK_FILE
    lock_bytes = lock_file.read_bytes() if lock_file.is_file() else None
    spent = 0.0
    idle = 0
    iteration = 0
    while True:
        iteration += 1
        env = dict(os.environ, SPECFORGE_CHANGE_DIR=str(change), SPECFORGE_ITERATION=str(iteration))
        result = subprocess.run(
            [*shlex.split(agent), PROMPT.format(change=change)],
            capture_output=True,
            text=True,
            env=env,
        )
        spent += cost_of(result.stdout)
        changed = [
            path for path, sha in approved.items()
            if not (root / path).is_file() or digest(root / path) != sha
        ]
        if changed:
            return stop(4, f"locked test changed: {', '.join(changed)}")
        if not progress_file.is_file():
            return stop(4, f"change folder moved: {change} no longer holds progress.md")
        if (lock_file.read_bytes() if lock_file.is_file() else None) != lock_bytes:
            return stop(4, f"lock file changed during the loop: {lock_file}")
        progress = progress_file.read_text()
        done, total = ticked(progress)
        print(f"loop: iteration {iteration} — {done}/{total} tasks, {spent:.2f} USD, agent exit {result.returncode}")
        reason = blocked(progress)
        if reason is not None:
            return stop(5, f"blocked: {reason}")
        if total and done == total:
            return stop(0, f"done in {iteration} iterations")
        if max_cost is not None and spent > max_cost:
            return stop(3, f"budget: {spent:.2f} USD spent, cap {max_cost:.2f}")
        idle = 0 if done > done_before else idle + 1
        done_before = done
        if idle >= NO_PROGRESS_LIMIT:
            return stop(2, f"no progress in {idle} iterations")
        if max_iterations is not None and iteration >= max_iterations:
            return stop(3, f"budget: {iteration} iterations, cap {max_iterations}")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Run an agent on a change, one clean context per iteration.")
    parser.add_argument("change", type=Path, help="the change folder, holding contract.md and progress.md")
    parser.add_argument("--agent", default=DEFAULT_AGENT, help=f"agent command (default: {DEFAULT_AGENT})")
    parser.add_argument("--max-iterations", type=int)
    parser.add_argument("--max-cost", type=float, help="USD")
    args = parser.parse_args(argv)
    iterations, cost = parse_budget((args.change / "progress.md").read_text())
    max_iterations = args.max_iterations or iterations
    if max_iterations is None:
        parser.error("no iteration cap: set **Budget**: in progress.md or pass --max-iterations")
    return run(args.change, args.agent, max_iterations, args.max_cost or cost)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
