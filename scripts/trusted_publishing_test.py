#!/usr/bin/env python3
"""Tests for specforge/changes/2026-10-26-trusted-publishing: cli-release publishes
through npm Trusted Publishing (OIDC), with no stored token. One test per acceptance
scenario, numbered the same way.

    python3 scripts/trusted_publishing_test.py          # from the specforge directory
"""

import re
import subprocess
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
WORKFLOW = ".github/workflows/cli-release.yml"


def steps(text):
    """{step name: its block}, split on `- name:` lines."""
    out = {}
    for block in re.split(r"\n(?=\s*- name: )", text):
        m = re.match(r"\s*- name: (.+)", block)
        if m:
            out[m.group(1).strip()] = block
    return out


def current():
    return (REPO / WORKFLOW).read_text()


class TrustedPublishingTests(unittest.TestCase):
    def test_1_no_token_and_no_registry_url(self):
        text = current()
        self.assertNotIn("NPM_TOKEN", text)
        self.assertNotIn("NODE_AUTH_TOKEN", text)
        self.assertNotIn("registry-url", text)

    def test_2_oidc_permission_node_24_and_npm_11_6_2_before_publish(self):
        text = current()
        self.assertRegex(text, r"(?m)^\s*id-token:\s*write\b")
        self.assertRegex(text, r"node-version:\s*['\"]24['\"]")
        names = list(steps(text))
        upgrade = [n for n, b in steps(text).items() if "npm install -g npm@11.6.2" in b]
        publish = [n for n, b in steps(text).items() if re.search(r"run:\s*npm publish\b", b)]
        self.assertEqual(len(upgrade), 1, names)
        self.assertEqual(len(publish), 1, names)
        self.assertLess(names.index(upgrade[0]), names.index(publish[0]))

    def test_3_publish_keeps_access_and_dist_tag_and_the_resolver_is_unchanged(self):
        text = current()
        publish = next(b for b in steps(text).values() if re.search(r"run:\s*npm publish\b", b))
        self.assertIn("--access public", publish)
        self.assertIn("steps.disttag.outputs.tag", publish)
        base = subprocess.run(["git", "show", f"93945a7:{WORKFLOW}"], cwd=REPO,
                              capture_output=True, text=True, check=True).stdout
        self.assertEqual(steps(text).get("Resolve dist-tag", "").strip(),
                         steps(base)["Resolve dist-tag"].strip())


if __name__ == "__main__":
    unittest.main(verbosity=2)
