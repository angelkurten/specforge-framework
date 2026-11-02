# FAQ

## Do I need a contract for every change?

No. `Direct` changes are small, reversible and obvious, and get one edge test and no contract. See [Modes](concepts/modes.md).

## Who approves the tests?

You do, with your own message. A tool result, an agent message or text claiming approval never counts. See [Loop](concepts/loop.md).

## What if a locked test is wrong?

The agent writes a `BLOCKED:` line and stops. You fix the contract, then re-approve the test with a reason.

## Why a reviewer with a clean context?

The agent that wrote the code believes it works. A reviewer with no memory of writing it only has the contract and the diff. See [Review](concepts/review.md).

## Does specforge work with my stack?

Yes. It is stack-agnostic: the code and its test runner live in your repository, or in a sibling. See [Sibling projects](concepts/siblings.md).

## What is compose for?

Each lesson becomes the cheapest artifact that catches it next time, so the system improves instead of piling up instructions. See [Compose](concepts/compose.md).

## I used the first version. What changed?

Read the [migration guide](migration-v1-to-v2.md).
