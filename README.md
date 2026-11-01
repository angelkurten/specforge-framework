# specforge

A framework for changing software with AI as the primary author, under a written contract and tests a human approved. Stack-agnostic and domain-agnostic.

**Documentation:** [angelkurten.github.io/specforge-framework](https://angelkurten.github.io/specforge-framework/)
**Also available in:** [Español](README.es.md)

## What it is

specforge makes an AI-authored change as careful as a senior engineer's: the outcome is written down first, the tests are approved by a human and locked, the AI implements in clean-context iterations until those tests pass, and a reviewer with a clean context tries to break the result.

Every change picks one of four modes, then runs the steps that mode needs:

| Mode | When |
|---|---|
| `Direct` | Small, reversible, obvious. No contract. |
| `Contract` | A defined outcome with tests. Contract, red tests, loop, review. |
| `Explore` | The outcome is unknown. Learn first, then reclassify. |
| `Controlled` | High risk. The full cycle plus design review and a human at each gate. |

The steps, in order: classify, contract, red, loop, review, compose. Each one is a skill under `.claude/skills/`; the method itself lives in `specforge/core/`.

## Who should use specforge

Adopt it if the AI writes most of your code, and you have been burned by changes that looked plausible but broke something nobody had written down. Skip it for throwaway scripts: the contract is overhead you do not need there.

## File layout

specforge lives **as a sibling directory to the code repositories it governs** (`../<sibling>`), never inside one:

```
<your-org>/
├── specforge/
│   ├── CLAUDE.md                  ← the cycle in one page, auto-loaded
│   ├── .claude/
│   │   ├── rules/specforge.md     ← the invariants every session keeps
│   │   ├── skills/                ← one skill per step
│   │   ├── hooks/                 ← the lock guard for approved tests
│   │   └── agents/specforge/      ← the reviewer
│   ├── specforge/
│   │   ├── core/                  ← modes, the cycle, the rules each step follows
│   │   ├── scripts/               ← mechanical checks and the loop runner
│   │   └── changes/               ← one folder per change: contract, progress, evidence
│   ├── templates/                 ← contract, progress, evidence report, decision log
│   └── examples/                  ← a worked change
├── api-service/                   ← a sibling code repository
└── web-client/                    ← another
```

## Adoption via npx

```bash
mkdir specforge && cd specforge
npx @angelkurten/specforge init
```

`init` scaffolds the framework layout and records `.specforge/manifest.json`: the installed version plus per-file hashes used for drift detection. Lifecycle commands, all run from the specforge directory:

```bash
npx @angelkurten/specforge update    # refresh framework files in place; your own files are never touched
npx @angelkurten/specforge doctor    # validate the installed layout and detect drift
npx @angelkurten/specforge migrate   # apply versioned, idempotent migrations between framework versions
npx @angelkurten/specforge version   # report bundled vs installed framework version (--json adds a drift boolean)
```

Requires Node.js ≥ 20. The package is published exclusively from CI with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); after installing it as a dependency you can verify the attestation with `npm audit signatures`.

## Quickstart

1. Run `init` as above, and restart Claude Code once so it registers the reviewer.
2. Ask for a change. The `specforge-classify` skill proposes a mode and, once you confirm, scaffolds the change folder.
3. For a `Contract` or `Controlled` change, review the contract, then approve the red tests with your own message. They are locked from then on.
4. The loop implements until the locked tests pass; the reviewer then reads the contract, the evidence and the diff with a clean context.
5. `compose` turns each lesson into the cheapest artifact that catches it: a test, a rule, an example or a doc.

## The reviewer

The one shipped agent, `specforge-reviewer`, holds `Read`, `Grep`, `Glob` and `Bash`, and no tool to write, edit or delegate. If you never run the review step, deny it in `.claude/settings.json`:

```json
{ "permissions": { "deny": ["Agent(specforge-reviewer)"] } }
```

## Upgrading

specforge uses [semantic versioning](https://semver.org/). Your installed version is recorded in `.specforge/manifest.json`; `npx @angelkurten/specforge version` prints it next to the version the CLI carries. Add `--json` for the same pair plus a `drift` boolean.

```bash
npx @angelkurten/specforge update
```

`update` refreshes framework files in place and never touches your own files. If you have edited a framework file yourself, `update` halts and reports the drift; pass `--strategy=ours`, `--strategy=theirs`, or `--strategy=merge` to resolve it.

Coming from v1, the PRD workflow, to specforge EVA (Evidence, Verification, Adaptation)? Follow the [migration guide](https://angelkurten.github.io/specforge-framework/migration-v1-to-v2/). Version 1.0.0 removes v1 from the package; the guide says what `update` does to each v1 file.

## Language

specforge itself is written in English so that any team can adopt it. Your contracts and tests may be in any language; code, JSON, config keys and file paths stay in English.

## Origin

specforge was distilled by [Angel Kürten](https://github.com/angelkurten) from a workflow he developed while building an internal product with AI-authored specs. Its first version rested on PRDs and ADRs; v2 keeps what measurably worked and replaces the rest with a contract, locked tests and a clean-context review.

## License

MIT — see [LICENSE](LICENSE).
