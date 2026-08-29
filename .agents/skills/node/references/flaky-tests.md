---
name: flaky-tests
description: Diagnose intermittent or hanging Node.js tests without adding external tooling.
metadata:
  tags: testing, flaky-tests, node-test, diagnostics
---

# Flaky Node.js Tests

The template's Node tests are `.test.mjs` files under `scripts/lint` and `tooling/code-style`, run through `pnpm test:guidance`, `pnpm test:code-style`, or `pnpm test:tooling`. Diagnose the smallest reproducible scope before changing production code.

## Narrow the Failure

Use the pinned Node test runner's controls directly:

```bash
node --test --test-reporter=spec scripts/lint/guidance.test.mjs
node --test --test-name-pattern="relevant test name" scripts/lint/guidance.test.mjs
node --test --test-concurrency=1 scripts/lint/*.test.mjs
node --test --test-timeout=5000 scripts/lint/guidance.test.mjs
```

Run the focused command repeatedly, then restore the normal package command. A test that passes only with concurrency `1` usually exposes shared state, a reused path or port, an ordering assumption, or incomplete cleanup.

## Eliminate Timing Assumptions

- Wait for a concrete event, condition, or promise instead of sleeping for an arbitrary duration.
- Register event listeners before starting work that may emit synchronously.
- Use `AbortSignal.timeout()` or the test runner timeout for a diagnostic deadline.
- Do not increase timeouts until the test identifies what is expected to complete.
- Avoid wall-clock assertions when a deterministic input or injected clock can prove the behavior.

## Own Every Resource

Common hanging resources include timers, subprocesses, servers, file watchers, streams, and unresolved promises. Register cleanup as soon as a test acquires a resource:

```js
import { promises as fs } from 'node:fs';
import os                 from 'node:os';
import path               from 'node:path';

async function createTemporaryRoot(testContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'template-test-'));
  testContext.after(() => fs.rm(root, {
    force     : true,
    recursive : true
  }));
  return root;
}
```

Restore patched globals, environment variables, console methods, and process listeners in cleanup even when an assertion fails.

## Keep Fixtures Isolated

- Give each test a unique temporary directory; do not reuse repository output folders.
- Avoid fixed ports and shared mutable module state.
- Await file writes, subprocess exits, stream completion, and cleanup.
- Assert stderr, stdout, exit status, and filesystem results separately so the failing contract is visible.
- Keep diagnostic output bounded and free of secrets.

Do not add undeclared handle-inspection packages or platform-specific shell utilities. Node's test reporter, inspector, diagnostic reports, and focused resource accounting are the default tools.
