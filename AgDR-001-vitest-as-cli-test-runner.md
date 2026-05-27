# AgDR-001: vitest as the @angelkurten/specforge test runner

**Status**: Recorded
**Date**: 2026-05-27
**Agent**: backend-architect (implementation lead for PRD-003)
**Triggering PRD**: PRD-003
**Sibling**: specforge
**Commit**: [TBD]

---

## 1. Decision

Adopted `vitest@^2` as the test runner for `tools/cli/`. The test files
created by the follow-on test-dispatch will use vitest's `describe` / `it` /
`expect` API and execute via `npm run test` (which invokes `vitest run`).
`@types/node` provides the Node ambient types; vitest provides the test
ambient types via its own auto-loaded typing.

## 2. Why the PRD did not cover this

PRD-003 § 9 specifies test **paths** (e.g.
`tools/cli/tests/unit/sha.test.ts`) and test **descriptions**, but
deliberately leaves the runner unspecified — § 7.1 only enumerates the
file layout, and `tools/cli/package.json` is created at implementation
time. The choice is between vitest (full-featured TypeScript-native
runner, mainstream in the 2026 ecosystem) and Node's built-in
`node:test` module (zero runtime deps but rougher API, no built-in
snapshot or watch). The decision had to be made now because the
follow-on dispatch writing the test files must import from a concrete
runner.

## 3. Alternatives Considered

### Option A — vitest (chosen)

Vitest is the de-facto TypeScript-first test runner in 2026. It supports
ESM out of the box (we ship ESM with `"type": "module"`), has built-in
TS support without an extra build step for tests, and matches the
expectations of contributors who have written TypeScript tests in the
last three years. Its API is a stable subset of Jest's, so test files
read naturally to anyone with Jest exposure.

### Option B — node:test (rejected)

Node's built-in test runner is dependency-free, which would shorten the
install graph by ~30 transitive packages. Rejected because: (a) it
lacks first-class TypeScript-without-build ergonomics — running
`*.test.ts` directly requires `--experimental-strip-types`, which is
unstable on Node 20.x and only stable in Node 22+; (b) PRD-003 § 9
includes 50+ test rows including integration and e2e cases — vitest's
fixture and concurrent-test ergonomics save substantial test-author
time; (c) the supply-chain risk of two extra direct dependencies
(`vitest`, `@types/node` already present) is small compared to the
maintenance cost of working around the runtime gaps.

## 4. Blast radius and reversal cost

The choice shapes ~50 test files written by the next dispatch. Reversing
it later means rewriting every test file from vitest's API to
`node:test`'s API — mechanical but tedious. No production code depends
on the runner, so the blast radius is confined to `tools/cli/tests/`
and `tools/cli/package.json`. Reversal cost: roughly one afternoon of
search-and-replace plus reconciling fixture lifecycles. The choice does
not affect the shipped package contents (`files` in `package.json`
excludes `tests/`).

## 5. Signals to Reconsider

| Signal | Action |
|--------|--------|
| Node ≥22 ships stable TS-strip and a test runner with feature parity | Reconsider node:test to drop the dev dependency |
| Vitest 3.x introduces a breaking change in `describe`/`it` semantics that touches every test file | Pin to vitest 2.x or migrate at that boundary |

---

## Related Documents

- [PRD-003: CLI for installation and lifecycle management](003-cli-for-installation-and-lifecycle.md) — the triggering PRD
