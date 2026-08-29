---
name: async-patterns
description: Built-in async, concurrency, event, and cancellation patterns for Node.js scripts and server-only code.
metadata:
  tags: async, promises, concurrency, cancellation
---

# Async Patterns

Apply these patterns to repository scripts and server-only Node.js code. Keep Node runtime decisions out of Client Components and browser bundles.

## Choose Execution Deliberately

- Await sequentially when order matters or one result controls the next operation.
- Use `Promise.all` only for independent work with a small, known fan-out.
- Bound concurrency when input size is variable; an unbounded `map` plus `Promise.all` can exhaust memory, file descriptors, or remote capacity.
- Use `Promise.allSettled` only when partial failure is part of the contract, and inspect every rejection.

Use a small built-in worker pool when no installed dependency already owns concurrency:

```js
async function mapWithConcurrency(items, concurrency, operation) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('concurrency must be a positive integer');
  }

  const results   = new Array(items.length);
  let nextIndex   = 0;
  const worker    = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await operation(items[currentIndex], currentIndex);
    }
  };
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
```

## Prefer Promise-Aware APIs

Prefer existing promise APIs such as `node:fs/promises`, `node:stream/promises`, and `node:events` `once()`. Construct `new Promise` only to adapt a callback or event API with no promise alternative, and settle it on every success, error, timeout, and cancellation path.

For one-shot events, subscribe before triggering the operation:

```js
import { once } from 'node:events';

const exitPromise = once(childProcess, 'exit');
startWork(childProcess);
const [code, signal] = await exitPromise;
```

## Make Cancellation Part of the Boundary

Accept an `AbortSignal` for bounded or user-cancellable work and pass it through to APIs that support it. The pinned Node runtime provides `AbortSignal.timeout()` for a finite deadline:

```js
async function fetchJson(url, timeoutMilliseconds) {
  const signal   = AbortSignal.timeout(timeoutMilliseconds);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}
```

Do not catch an abort merely to continue silently. Handle it as an expected outcome or rethrow it with the original error as `cause`.

## Avoid Hidden Async Lifecycles

- Use async factory functions when initialization requires `await`; constructors and module imports must not hide unfinished setup.
- Return or await every promise that controls correctness.
- Attach cleanup in `finally` when the operation acquires files, timers, subprocesses, listeners, or temporary directories.
- Do not add retry loops without a finite attempt count, cancellation, and an idempotent operation contract.
