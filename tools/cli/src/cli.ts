#!/usr/bin/env node
// specforge CLI entry point. PRD-003 § 5.0, § 8.1.
//
// First action: independent Node version check, exit 2 if below 20.0.0.

import { runInit } from "./commands/init.js";
import { runUpdate } from "./commands/update.js";
import { runDoctor } from "./commands/doctor.js";
import { runMigrate } from "./commands/migrate.js";
import { runVersion } from "./commands/version.js";
import { printError } from "./output.js";

const MIN_NODE_MAJOR = 20;

function parseNodeMajor(versionStr: string): number {
  const m = /^v?(\d+)/.exec(versionStr);
  return m ? parseInt(m[1]!, 10) : 0;
}

interface ParsedArgs {
  command: string | null;
  positional: string[];
  flags: Map<string, string | true>;
  multi: Map<string, string[]>;
}

const MULTI_FLAGS = new Set(["rule", "ignore-sibling"]);

function parseArgs(argv: ReadonlyArray<string>): ParsedArgs {
  let command: string | null = null;
  const positional: string[] = [];
  const flags = new Map<string, string | true>();
  const multi = new Map<string, string[]>();

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!command && !a.startsWith("-")) {
      command = a;
      continue;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      let name: string;
      let value: string | true;
      if (eq >= 0) {
        name = a.slice(2, eq);
        value = a.slice(eq + 1);
      } else {
        name = a.slice(2);
        value = true;
      }
      if (MULTI_FLAGS.has(name)) {
        const arr = multi.get(name) ?? [];
        if (value === true) {
          // --rule with no value is invalid; record empty to surface later.
          arr.push("");
        } else {
          arr.push(value);
        }
        multi.set(name, arr);
      } else {
        flags.set(name, value);
      }
    } else if (a.startsWith("-")) {
      flags.set(a.slice(1), true);
    } else {
      positional.push(a);
    }
  }

  return { command, positional, flags, multi };
}

function boolFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.get(name) === true || args.flags.get(name) === "true";
}

function stringFlag(args: ParsedArgs, name: string): string | null {
  const v = args.flags.get(name);
  if (typeof v === "string") return v;
  return null;
}

function printUsage(): void {
  process.stdout.write(`specforge — install, update, validate, and migrate specforge framework layouts.

Usage:
  specforge init    [--force] [--erase] [--no-git-safety] [--dry-run] [--quiet]
  specforge update  [--strategy=ours|theirs|merge] [--dry-run] [--quiet]
  specforge doctor  [--json] [--rule=<id>] [--ignore-sibling=<name>] [--quiet]
  specforge migrate [--apply] [--to=<version>] [--allow-downgrade]
                    [--acknowledge-security-rollback] [--json] [--dry-run] [--quiet]
  specforge version [--json]

See PRD-003 for the full contract.
`);
}

async function main(argv: ReadonlyArray<string>): Promise<number> {
  // Step 1: Node version guard (§ 8.1).
  const nodeMajor = parseNodeMajor(process.versions.node);
  if (nodeMajor < MIN_NODE_MAJOR) {
    printError({
      message: `Node.js ${process.versions.node} is below the required minimum ${MIN_NODE_MAJOR}.0.0`,
      remediation: `install Node.js >=${MIN_NODE_MAJOR}.0.0`,
      exitCode: 2,
    });
    return 2;
  }

  const args = parseArgs(argv);
  const cwd = process.cwd();
  const importMetaUrl = import.meta.url;

  if (!args.command || args.command === "help" || boolFlag(args, "help") || boolFlag(args, "h")) {
    printUsage();
    return args.command ? 0 : 2;
  }

  const json = boolFlag(args, "json");
  const quiet = boolFlag(args, "quiet");
  const dryRun = boolFlag(args, "dry-run");

  switch (args.command) {
    case "init":
      return runInit({
        cwd,
        force: boolFlag(args, "force"),
        erase: boolFlag(args, "erase"),
        noGitSafety: boolFlag(args, "no-git-safety"),
        dryRun,
        quiet,
        importMetaUrl,
      });

    case "update": {
      const strategy = stringFlag(args, "strategy");
      if (strategy && !["ours", "theirs", "merge"].includes(strategy)) {
        printError({
          message: `invalid --strategy value: ${strategy}`,
          remediation: "use --strategy=ours, --strategy=theirs, or --strategy=merge",
          exitCode: 2,
        });
        return 2;
      }
      return runUpdate({
        cwd,
        strategy: (strategy as "ours" | "theirs" | "merge" | null) ?? null,
        dryRun,
        quiet,
        importMetaUrl,
      });
    }

    case "doctor":
      return runDoctor({
        cwd,
        json,
        rules: args.multi.get("rule") ?? [],
        ignoreSiblings: args.multi.get("ignore-sibling") ?? [],
        quiet,
        importMetaUrl,
      });

    case "migrate":
      return runMigrate({
        cwd,
        apply: boolFlag(args, "apply"),
        to: stringFlag(args, "to"),
        allowDowngrade: boolFlag(args, "allow-downgrade"),
        acknowledgeSecurityRollback: boolFlag(args, "acknowledge-security-rollback"),
        json,
        dryRun,
        quiet,
        importMetaUrl,
      });

    case "version":
      return runVersion({ cwd, json, importMetaUrl });

    default: {
      // Surface unknown flag errors that the parser couldn't categorise
      // (e.g. a typo).
      printError({
        message: `unknown command: ${args.command}`,
        remediation: "run `specforge --help` for the supported command list",
        exitCode: 2,
      });
      return 2;
    }
  }
}

// Detect spurious unknown flags inside any command's flag set.
function detectUnknownFlags(argv: ReadonlyArray<string>): string | null {
  const known = new Set([
    "help",
    "h",
    "force",
    "erase",
    "no-git-safety",
    "dry-run",
    "quiet",
    "strategy",
    "json",
    "rule",
    "ignore-sibling",
    "apply",
    "to",
    "allow-downgrade",
    "acknowledge-security-rollback",
  ]);
  for (const a of argv) {
    if (a.startsWith("--")) {
      const name = a.slice(2).split("=")[0]!;
      if (!known.has(name)) return name;
    }
  }
  return null;
}

const argv = process.argv.slice(2);
const unknown = detectUnknownFlags(argv);
if (unknown !== null) {
  printError({
    message: `unknown flag: --${unknown}`,
    remediation: "run `specforge --help` for the supported flag list",
    exitCode: 2,
  });
  process.exit(2);
}

main(argv)
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    printError({
      message: `unhandled error: ${err instanceof Error ? err.message : String(err)}`,
      remediation: "file an issue at https://github.com/angelkurten/specforge",
      exitCode: 10,
    });
    process.exit(10);
  });
