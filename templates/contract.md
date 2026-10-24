# <!-- Change name -->

**Mode**: <!-- Direct | Contract | Explore | Controlled -->

<!--
  A change contract states the minimum intent the agent needs so it does not
  guess. It fits on one screen. If a section has nothing to say, write one
  line saying so and move on.

  It lives in the change's own folder, next to the progress file, with no
  global number: specforge/changes/<YYYY-MM-DD>-<slug>/contract.md. It is archived with
  the change when it merges.

  Direct mode writes no contract. Explore mode writes one after the
  prototype, never before.
-->

## Outcome

<!-- What the user can do after this change that they could not do before. -->

## Scope

<!-- What is in, and what is explicitly out. -->

## Context

<!-- Existing files, components and decisions that matter, as paths. -->

## Constraints

<!-- Compatibility, security, performance, patterns to respect. -->

## Premises

<!--
  The beliefs whose failure would make this change wrong, each with the
  cheapest command that checks it and what it returned. One bullet per
  premise, in exactly this format, so loop.py can read it:

  - <premise> — `<command>` → holds
  - <premise> — `<command>` → fails: <what it returned>
  - none — <the reason there is no premise>

  The loop does not start while a premise has no result or a failed one.
  A failed premise sends the change back to Classify.
-->

## Acceptance evidence

<!--
  Observable scenarios plus the commands that must pass. In Contract and
  Controlled mode each scenario becomes a failing test before any code is
  written.
-->

## Stop and escalate

<!--
  When the agent stops and asks for a human decision. Include the loop
  budget: maximum iterations and cost. Without progress, the loop stops
  after 3 iterations regardless.
-->
