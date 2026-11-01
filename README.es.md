# specforge

Un framework para cambiar software con la IA como autora principal, bajo un contrato escrito y tests que un humano aprobó. Agnóstico de stack y de dominio.

**Documentación:** [angelkurten.github.io/specforge-framework](https://angelkurten.github.io/specforge-framework/)
**También disponible en:** [English](README.md)

## Qué es

specforge hace que un cambio escrito por IA sea tan cuidadoso como el de un ingeniero senior: primero se escribe el resultado esperado, un humano aprueba los tests y se bloquean, la IA implementa en iteraciones de contexto limpio hasta que esos tests pasan, y un revisor con contexto limpio intenta romper el resultado.

Cada cambio elige uno de cuatro modos, y corre los pasos que ese modo necesita:

| Modo | Cuándo |
|---|---|
| `Direct` | Pequeño, reversible, obvio. Sin contrato. |
| `Contract` | Un resultado definido con tests. Contrato, tests en rojo, loop, review. |
| `Explore` | El resultado se desconoce. Primero se aprende, luego se reclasifica. |
| `Controlled` | Alto riesgo. El ciclo completo más revisión de diseño y un humano en cada compuerta. |

Los pasos, en orden: classify, contract, red, loop, review, compose. Cada uno es un skill bajo `.claude/skills/`; el método vive en `specforge/core/`.

## Quién debería usar specforge

Adoptalo si la IA escribe la mayor parte de tu código y te quemaron cambios que parecían plausibles pero rompían algo que nadie había escrito. Salteátelo para scripts descartables: ahí el contrato es peso muerto.

## Estructura de archivos

specforge vive **como directorio hermano de los repositorios de código que gobierna** (`../<sibling>`), nunca dentro de uno:

```
<tu-org>/
├── specforge/
│   ├── CLAUDE.md                  ← el ciclo en una página, se carga solo
│   ├── .claude/
│   │   ├── rules/specforge.md     ← los invariantes que toda sesión respeta
│   │   ├── skills/                ← un skill por paso
│   │   ├── hooks/                 ← el guardián de los tests aprobados
│   │   └── agents/specforge/      ← el revisor
│   ├── specforge/
│   │   ├── core/                  ← modos, el ciclo, las reglas de cada paso
│   │   ├── scripts/               ← chequeos mecánicos y el runner del loop
│   │   └── changes/               ← una carpeta por cambio: contrato, progreso, evidencia
│   ├── templates/                 ← contrato, progreso, reporte de evidencia, log de decisiones
│   └── examples/                  ← un cambio trabajado
├── api-service/                   ← un repositorio de código hermano
└── web-client/                    ← otro
```

## Adopción vía npx

```bash
mkdir specforge && cd specforge
npx @angelkurten/specforge init
```

`init` crea la estructura del framework y registra `.specforge/manifest.json`: la versión instalada más los hashes por archivo que sirven para detectar drift. Comandos de ciclo de vida, todos desde el directorio specforge:

```bash
npx @angelkurten/specforge update    # refresca los archivos del framework en el lugar; los tuyos nunca se tocan
npx @angelkurten/specforge doctor    # valida la estructura instalada y detecta drift
npx @angelkurten/specforge migrate   # aplica migraciones versionadas e idempotentes entre versiones
npx @angelkurten/specforge version   # versión incluida vs instalada (--json agrega un booleano drift)
```

Requiere Node.js ≥ 20. El paquete se publica exclusivamente desde CI con [npm provenance](https://docs.npmjs.com/generating-provenance-statements); al instalarlo como dependencia podés verificar la atestación con `npm audit signatures`.

## Inicio rápido

1. Corré `init` como arriba y reiniciá Claude Code una vez para que registre el revisor.
2. Pedí un cambio. El skill `specforge-classify` propone un modo y, cuando lo confirmás, crea la carpeta del cambio.
3. En un cambio `Contract` o `Controlled`, revisá el contrato y aprobá los tests en rojo con tu propio mensaje. Desde ahí quedan bloqueados.
4. El loop implementa hasta que los tests bloqueados pasan; después el revisor lee el contrato, la evidencia y el diff con contexto limpio.
5. `compose` convierte cada lección en el artefacto más barato que la atrape: un test, una regla, un ejemplo o un doc.

## El revisor

El único agente incluido, `specforge-reviewer`, tiene `Read`, `Grep`, `Glob` y `Bash`, y ninguna herramienta para escribir, editar o delegar. Si nunca corrés el paso de review, denegalo en `.claude/settings.json`:

```json
{ "permissions": { "deny": ["Agent(specforge-reviewer)"] } }
```

## Actualización (upgrade)

specforge usa [versionado semántico](https://semver.org/). Tu versión instalada queda registrada en `.specforge/manifest.json`; `npx @angelkurten/specforge version` te la imprime al lado de la versión que trae el CLI. Agregale `--json` para obtener ese mismo par más un booleano `drift`.

```bash
npx @angelkurten/specforge update
```

`update` refresca los archivos del framework en el lugar y nunca toca los tuyos. Si editaste vos mismo un archivo del framework, `update` frena y reporta el drift; pasale `--strategy=ours`, `--strategy=theirs`, o `--strategy=merge` para resolverlo.

¿Pasás de v1, el workflow de PRDs, a specforge EVA (Evidence, Verification, Adaptation)? Seguí la [guía de migración](https://angelkurten.github.io/specforge-framework/migration-v1-to-v2/). La versión 1.0.0 saca v1 del paquete; la guía explica qué hace `update` con cada archivo de v1.

## Idioma

specforge mismo está escrito en inglés para que cualquier equipo pueda adoptarlo. Tus contratos y tests pueden estar en el idioma que prefieras; código, JSON, config keys y file paths siempre en inglés.

## Origen

specforge fue destilado por [Angel Kürten](https://github.com/angelkurten) a partir de un workflow que desarrolló mientras construía un producto interno con specs escritas por IA. Su primera versión se apoyaba en PRDs y ADRs; v2 conserva lo que comprobadamente funcionó y reemplaza el resto con un contrato, tests bloqueados y una review de contexto limpio.

## Licencia

MIT — ver [LICENSE](LICENSE).
