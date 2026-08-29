---
name: error-handling
description: Dependency-free error handling for Node.js scripts and server-only runtime boundaries.
metadata:
  tags: errors, cause, exit-codes, boundaries
---

# Error Handling

Handle expected failures where the code can recover or translate them. Otherwise preserve the original failure and let the process or framework boundary report it once.

## Preserve Error Information

Wrap an error only when adding actionable context, and retain the original value as `cause`:

```js
try {
  await copyAssets();
} catch (error) {
  throw new Error('Failed to copy standalone assets', {
    cause: error
  });
}
```

At an unknown boundary, narrow before reading error fields:

```js
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCode(error, expectedCode) {
  return error instanceof Error
    && 'code' in error
    && error.code === expectedCode;
}
```

Do not use `any`, discard stacks, or assume every thrown value is an `Error`.

## Keep Expected and Unexpected Failures Distinct

- Check stable platform fields such as filesystem `code`, subprocess exit status, and signals for expected outcomes.
- Do not match full human-readable messages when a stable code or status exists.
- Translate errors at process, route, or service boundaries; lower-level helpers should not invent HTTP responses or user-facing copy.
- Avoid dependency-specific error abstractions unless that dependency is already installed and owns the boundary.

## Command-Line Entry Points

Set `process.exitCode` after reporting a failure so pending output and cleanup can finish. Reserve immediate `process.exit()` for a proven process-level emergency.

```js
try {
  await main();
} catch (error) {
  console.error(`tool-name: ${errorMessage(error)}`);
  process.exitCode = 1;
}
```

For subprocesses, inspect both exit code and signal. Bound captured output and include only safe excerpts in a new error.

## Cleanup and Reporting

- Put resource release in `finally` or register an idempotent cleanup callback when ownership begins.
- Do not use empty catch blocks or log and then silently continue with invalid state.
- Avoid logging the same failure at every layer; add context once and report at the owning boundary.
- Redact secrets, environment values, request credentials, and sensitive arguments.
- Keep retries finite, cancellable, and limited to operations known to be idempotent.
