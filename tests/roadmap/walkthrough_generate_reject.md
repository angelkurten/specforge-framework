# Test #28: Walkthrough — generative flow — reject path

**Type**: e2e
**PRD reference**: [PRD-001 §9 row #28](../../001-product-roadmap.md#9-test-plan)

## What this verifies

The critical panel (§4.1 step 5) gates evidence-less candidates before write (§4.1 step 7). A failure here means an evidence-less item can reach `ROADMAP.md` because the critic was not consulted or was overridden without user resolution.

## Fixtures

- Working specforge repo post-PRD-001.
- Existing `ROADMAP.md`.
- A seeded evidence-less candidate (planted in the generator output, or injected into the consolidated set) alongside 2–3 valid candidates (with real evidence entries per §5.5).
- User trigger: "expand the roadmap".

## Steps

1. Trigger the generative cycle.
2. Allow consolidation and critic dispatch to run.
3. At user-resolution step, kill the evidence-less candidate per the critic's 🔴.
4. Let write (step 7) execute.
5. Inspect the `ROADMAP.md` diff and the session transcript.

## Pass criteria

- [ ] (1) Evidence critic emits 🔴 for the evidence-less candidate.
- [ ] (2) It never reaches `ROADMAP.md`.
- [ ] (3) Valid candidates still land.

## Fail examples

- The evidence-less candidate lands anyway because the critic emitted only 🟡 or because the user's resolution step was skipped.
- Valid candidates are also rejected by "safety-first" logic — the critic must be surgical, not blanket.
- The critic emits 🔴 but the lead agent silently writes the candidate anyway — resolution-before-write is mandatory.
