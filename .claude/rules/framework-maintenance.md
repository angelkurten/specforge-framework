---
name: specforge framework maintenance
description: Rules for editing specforge's own framework files (CLAUDE.md, CONVENTIONS.md, SIBLINGS.md, .claude/rules/*). Loads only when editing framework files themselves.
paths:
  - "CLAUDE.md"
  - "CONVENTIONS.md"
  - ".claude/rules/*.md"
---

# Framework maintenance

You are editing specforge itself — the framework, not a team's PRD. The rules here govern how specforge evolves without re-accumulating the bloat it was designed to avoid.

## Keep CLAUDE.md small

CLAUDE.md is loaded at session start and is resident for the entire PRD authoring session. Every line competes for LLM attention against hard rules, mental model, gate block rules, and every other instruction in context.

**Target: under 50 lines.** Detailed rules go in `.claude/rules/*.md`, not inline in CLAUDE.md. CLAUDE.md's job is to point the AI at the right rule files and carry the minimal mental model — nothing more.

If you find yourself wanting to add a multi-paragraph explanation to CLAUDE.md, stop. That content belongs in a rule file, `CONVENTIONS.md`, or `README.md`.

## Rule file conventions

Every `.claude/rules/*.md` file starts with YAML frontmatter:

```yaml
---
name: <short descriptive name>
description: <one-line description; used to decide relevance when scanning the rules directory>
paths:          # omit entirely for unscoped (always-loaded) rules
  - "<glob>"    # include only when the rule applies to a specific file pattern
---
```

**One topic per file.** The filename is the topic. Do not crowd unrelated rules into a single file "because it's easier to edit" — the separation is the forcing function against re-bloat. A rule file that mixes gate-block rules with ADR-format rules is already too large.

## Adding a new rule

- **Rule applies in every session (PRD drafting, grounding, review)** → add to the topically-correct unscoped rule file (`hard-rules.md`, `workflow.md`, `gate-block.md`, `prd-authoring.md`), or create a new unscoped rule file if the topic does not fit.
- **Rule applies only when editing a specific file type** (e.g. ADRs, framework files, reviewer briefings) → create a new path-scoped rule file with a `paths:` glob.
- **Never add rules directly to `CLAUDE.md`.** CLAUDE.md is a pointer file, not a rule container. If you catch yourself editing CLAUDE.md to add a rule, move it to a rule file and update the pointer instead.

## Adding a new reviewer role

The default multi-reviewer panel is four roles (backend, frontend, security, quality). Teams may need more — `performance-reviewer`, `a11y-reviewer`, `data-reviewer`, `infra-reviewer`, etc. To add one:

1. Drop a new briefing file in `agents/` following the pattern `<role>-reviewer.md`.
2. Copy the structure of an existing briefing (e.g. `agents/backend-reviewer.md`): the five `{{VARIABLE}}` inputs (`{{PRD_PATH}}`, `{{SIBLING_CLAUDE_MD_PATH}}`, `{{CODE_REFERENCES}}`, `{{SYSTEM_ARTIFACT_PATH}}`, `{{DOMAIN_CONTEXT}}`), the "What you must do" steps including the mandatory "Read `{{SIBLING_CLAUDE_MD_PATH}}` first" step, the severity scheme (🔴🟡🟢), the report format with `file:line` citations, and the single-line verdict.
3. **No registry update is needed.** Reviewer roles are not enumerated in `CLAUDE.md` or any rule file. The team lead dispatching the panel at workflow step 5 chooses which briefings to launch based on the PRD's domain — `workflow.md` step 5 says "a typical panel of 4, adapted to the domain", and that adaptation is driven by which briefings exist in `agents/`.
4. If the new role has different dispatch semantics than "one instance per impacted sibling" (e.g. cross-cutting threat model like `security-reviewer.md`), document it in the briefing's "Note on multi-sibling PRDs" block so the team lead knows whether to launch one-per-sibling or a single instance.

The existing four briefings in `agents/` are canonical reference implementations. When in doubt about format, copy from `agents/backend-reviewer.md`.

## Splitting an existing rule file

If a rule file grows past ~150 lines or accumulates unrelated sub-topics, split it. The filename schema and the `name:` frontmatter field make the split traceable in the rules directory.

## CONVENTIONS.md vs rule files

Two different concerns:

- **`CONVENTIONS.md`** is reference material: exact header shapes, naming patterns, diagram syntax, cross-reference formats. Lookup when you need to know the exact shape of something.
- **`.claude/rules/*.md`** are behavioral rules: what the AI must or must not do. Loaded into context automatically at session start (unscoped) or on file match (scoped).

A thing that answers "what shape should this be?" belongs in `CONVENTIONS.md`. A thing that answers "what must I verify / never do / always do when writing this?" belongs in a rule file.

## No marketing language

Same as hard rule 9. Applies to the framework's own files too. Forbidden: "blazingly fast", "enterprise-grade", "best-in-class", "robust", "seamless".

## v2.0 upgrade contract

Framework files (`CLAUDE.md`, `CONVENTIONS.md`, `.claude/rules/*`, `templates/*`, `examples/*`, `agents/*`, `README.md`, `LICENSE`) are updated by pulling a new version of specforge. Team data (`SIBLINGS.md`, the team's own PRDs and ADRs) is never touched by upgrades. If you find yourself wanting to put team-mutable content in a framework file, stop — it belongs in `SIBLINGS.md` or in the team's PRDs.
