---
name: testing
description: Deterministic tests for Node.js repository tooling with the built-in runner
metadata:
  tags: testing, node-test, assertions, subprocesses, fixtures
---

# Testing in Node.js

## Use the built-in runner

Repository tooling tests are `.test.mjs` files and use `node:test` plus `node:assert/strict`. Do not add a test framework for coverage already supported by the pinned Node runtime.

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';

test('normalizes one record', async () => {
  const actual = await normalizeRecord({ name: ' sample ' });

  assert.deepEqual(actual, { name: 'sample' });
});
```

Test observable behavior rather than private implementation details. Include success, invalid input, boundary values, and expected failure output.

## Isolate state

Create a fresh fixture per test and register cleanup immediately:

```javascript
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('writes output inside the selected root', async (testContext) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'template-nextjs-'));
  testContext.after(() => rm(fixtureRoot, { force: true, recursive: true }));

  // Exercise the fixtureRoot only.
});
```

Do not depend on test order, the developer's working tree, ambient environment variables, wall-clock delays, public network access, or a shared mutable singleton. Restore mocks and environment changes in cleanup hooks.

## Test command boundaries

For CLI behavior, launch Node directly with an argument array, `shell: false`, a finite timeout, and captured output. Assert all termination channels:

```javascript
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['scripts/lint/guidance.mjs'],
  { encoding: 'utf8', shell: false, timeout: 10_000 },
);

assert.equal(result.error, undefined);
assert.equal(result.signal, null);
assert.equal(result.status, 0, result.stderr);
```

When testing events, create the `once()` promise before starting work that may emit the event. Otherwise a synchronous emission can be missed and the test can hang.

## Run the project commands

- `pnpm test:code-style` runs tests owned by `tooling/code-style`.
- `pnpm test:guidance` runs guidance and Cursor hook tests.
- `pnpm test:tooling` runs both suites.
- `node --test path/to/file.test.mjs` is appropriate for a focused local run.

Application `.ts` and `.tsx` files belong to the Next.js compiler path. Use `pnpm typecheck`, the production build, and a purpose-built integration test for framework behavior instead of importing Client Components into the raw Node test runner.
