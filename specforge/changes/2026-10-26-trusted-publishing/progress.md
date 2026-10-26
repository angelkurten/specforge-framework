# Progress

**Budget**: 6 iterations, 2 USD

## Tasks

- [ ] scripts/trusted_publishing_test.py test_1_no_token_and_no_registry_url
- [ ] scripts/trusted_publishing_test.py test_2_oidc_permission_node_24_and_npm_11_6_2_before_publish
- [ ] scripts/trusted_publishing_test.py test_3_publish_keeps_access_and_dist_tag_and_the_resolver_is_unchanged
- [ ] every suite in `.github/workflows/v2-ci.yml` passes (run them as that file does)

## Blocked

## Log
- Lead: test 3 already passes at the base. It guards that the publish step and the `Resolve dist-tag` step survive the edit. Keep the comments in `cli-release.yml` accurate: the permissions comment and the dist-tag comment must describe OIDC, not a token. Never print or echo a credential (hard rule 16). `pnpm test` in `tools/cli` is not in your tools; the lead runs cli-ci.
