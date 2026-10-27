# Compose

| Lesson | Rung | Artifact | Why not lower |
|---|---|---|---|
| A sibling repository's artifact is accepted, and a refused compose is not archived | 1 test | `scripts/compose_siblings_test.py` | — |
| The lead archived with compose_check red, by chaining the check with `;` | 2 rule | `specforge/scripts/archive.py` | It now runs compose_check itself; that is the rule that would have stopped it |
| The sibling Explore checked four of the five scripts and missed `compose_check.py` | 4 instruction | `.claude/skills/specforge-loop/SKILL.md` | Which scripts hold a path assumption is a judgement made when the premises are written |
