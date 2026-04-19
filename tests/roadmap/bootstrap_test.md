# Test #22: Bootstrap item seeded

**Type**: conformance
**PRD reference**: [PRD-001 §9 row #22](../../001-product-roadmap.md#9-test-plan)

## What this verifies

§10.1 step 3 requires the implementation commit for PRD-001 to seed `ROADMAP.md` with exactly one bootstrap item — `ROADMAP-001: Introduce the roadmap cycle`, status `Shipped`, evidence `[PRD-001]`, `last_reviewed` stamped. This exercises the retroactive-escape path on day one. A failure here means the roadmap either ships empty or with speculative content.

## Fixtures

Check out the implementation commit for PRD-001 (the merge commit on the feature branch referenced in the gate block's `commit_hash`). Open `ROADMAP.md` at that commit.

## Steps

1. Read `ROADMAP.md` at the PRD-001 implementation commit.
2. Enumerate all items via regex `^### ROADMAP-(\d{3}): `.
3. Read the `ROADMAP-001` block's fields.

## Pass criteria

- [ ] Exactly one item exists in `ROADMAP.md` at that commit (regex match count = 1).
- [ ] The item id is `ROADMAP-001` and its title is `Introduce the roadmap cycle` (verbatim).
- [ ] `Status` field equals `Shipped`.
- [ ] `Evidence` list has exactly one entry: `PRD-001` (category-7 meta-reference, permitted by §5.5 for retroactive items).
- [ ] `Last reviewed` is populated with a UTC date matching the commit's date (not `[TBD]`, not absent).
- [ ] `PRD` field is populated with `PRD-001`.
- [ ] No themes exist in the file (no `^### ROADMAP-T-(\d{3}): ` matches) — the bootstrap ships items only.

## Fail examples

- Two items are present (the bootstrap plus a "wishlist" item) — §10.1 specifies exactly one.
- `Status: Candidate` — bootstrap must be Shipped.
- `Evidence:` is populated with a real category-1..6 entry instead of the permitted meta-reference — bootstrap exists because the PRD shipped, and §5.5 allows `[PRD-NNN]` as evidence only for retroactive items.
