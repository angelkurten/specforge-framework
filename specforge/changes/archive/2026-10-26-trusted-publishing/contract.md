# Publish through npm Trusted Publishing instead of a token

**Mode**: Contract

```
MODE PROPOSAL
Risk: high — changes how the package is published to npm (credentials and the public release)
Uncertainty: low — npm documents the mechanism; the only part checked by running is the first publish
Controlled flag: no — one team, no named regime
Mode: Contract
```

Confirmed by the human, 2026-10-26.

## Outcome

`cli-release` publishes `@angelkurten/specforge` through npm Trusted Publishing (GitHub OIDC), with no stored token. The 0.28.0 publish failed twice with `E404` on the `PUT` while using `NPM_TOKEN` (run 40267342281, attempts 1 and 2). Once the human registers the trusted publisher on npmjs.com, 0.28.0 publishes from CI with provenance and no secret to renew.

## Scope

In:
- `.github/workflows/cli-release.yml`:
  - the publish job runs on Node 24, and a step installs npm `11.6.2` before publishing (npm requires 11.5.1 or later and Node 22.14.0 or later);
  - `NODE_AUTH_TOKEN` and `secrets.NPM_TOKEN` are removed;
  - `registry-url` is removed from `setup-node`, so no `.npmrc` with a token placeholder is written;
  - `id-token: write` stays;
  - the dist-tag step stays as it is.
- A test over the workflow file.

Out:
- Registering the trusted publisher on npmjs.com, which only the human can do. The fields are: owner `angelkurten`, repository `specforge-framework`, workflow `cli-release.yml`, no environment.
- Deleting the `NPM_TOKEN` secret, which is the human's choice after the first publish works.
- Re-tagging or dispatching the 0.28.0 publish. The lead does that after archive, with the human's approval.
- `cli-ci.yml`, CLI source, and `package.json`. `publishConfig.provenance: true` stays and agrees with OIDC.

## Context

- `.github/workflows/cli-release.yml:13-15,32-37,76-79`: the permissions, `setup-node` with `registry-url`, and the publish step with `NODE_AUTH_TOKEN`.
- `https://docs.npmjs.com/trusted-publishers`, read 2026-10-26. It sets these requirements:
  - npm 11.5.1 or later and Node 22.14.0 or later;
  - `id-token: write`;
  - GitHub-hosted runners;
  - the workflow filename on npmjs.com matching exactly;
  - `repository.url` matching the repository.

  Provenance is automatic for a public package published via OIDC from a public repository.
- `tools/cli/package.json:8`: `git+https://github.com/angelkurten/specforge-framework.git`.
- `tools/cli/tests/e2e/provenance-metadata.test.ts:55`: `publishConfig.provenance` must stay `true`.
- `.github/workflows/cli-release.yml` is team data for the CLI (`tools/cli/tests/unit/partition.test.ts:67`), so the file is never bundled.

## Constraints

- No credential, token value or env dump appears in the workflow, logs or this change (hard rule 16).
- The publish step keeps its dist-tag logic, so a backfilled tag cannot demote `latest`.
- Every suite in `v2-ci.yml` and `cli-ci` passes.

## Premises

- The repository is public, so OIDC provenance is automatic — `gh repo view --json visibility -q .visibility` → holds
- `repository.url` matches the GitHub repository — `grep -c 'github.com/angelkurten/specforge-framework.git' tools/cli/package.json` → holds
- npm `11.6.2` exists in the registry — `npm view npm@11.6.2 version` → holds
- Only the partition and bundle suites name the workflow file, and none reads its content — `grep -rn "cli-release" tools/cli/tests scripts tests` → holds

## Acceptance evidence

`python3 scripts/trusted_publishing_test.py`, every suite in `v2-ci.yml`, and `pnpm test` in `tools/cli` all pass:

1. `cli-release.yml` names no `NPM_TOKEN` and no `NODE_AUTH_TOKEN`, and `setup-node` has no `registry-url`.
2. The job keeps `id-token: write`, runs `actions/setup-node` with `node-version: '24'`, and has a step running `npm install -g npm@11.6.2` before the publish step.
3. The publish step runs `npm publish` with `--access public` and the dist-tag output, and the `Resolve dist-tag` step is unchanged from `93945a7`.

## Stop and escalate

Stop and ask if the change needs a CLI source or `package.json` change. Budget: 6 iterations, 2 USD, for 4 tasks (3 scenarios and the full suite).
