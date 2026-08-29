---
name: logging
description: Dependency-free operational logging for repository scripts and server-only Node.js code.
metadata:
  tags: logging, diagnostics, redaction, cli
---

# Logging

Use the smallest logging contract that the owning script or server boundary requires. The template does not install a logging framework.

## Preserve Command Channels

- Write machine-readable results or normal command output to stdout.
- Write warnings, diagnostics, and failures to stderr.
- Prefix human-readable diagnostics with the script name.
- Keep successful output concise so CI logs remain useful.
- When a subprocess should be interactive, prefer inherited stdio. When output must be captured, set a finite buffer and report safe excerpts only.

```js
console.log('Formatted 3 files.');
console.warn('formatter: skipped an unsupported file');
console.error('formatter: failed to read the target');
```

## Log Structured Context Deliberately

Use a plain object only when its fields improve diagnosis. Keep keys stable and values bounded:

```js
console.error('run-next: child process failed', {
  code,
  signal
});
```

Avoid dumping request objects, environment objects, arbitrary errors, or large command output. When logging an error, prefer a safe message plus the original error as `cause` at the single owning boundary.

## Redact Sensitive Data

Never log:

- authorization headers, cookies, session identifiers, or API tokens
- passwords, private keys, or connection strings
- complete environment objects
- user-provided data unrelated to diagnosis
- shell commands containing secret arguments

Redaction must happen before serialization. Replacing sensitive text after writing it is not a security boundary.

## Debug Output

Gate verbose diagnostics behind an explicit command flag or documented environment contract owned by the script. Debug logging must not change timing-sensitive behavior, consume unbounded memory, or expose secrets.

## Dependency Boundary

Do not introduce a logging package, transport, external service, or framework integration because another project uses one. If structured production logging becomes a concrete requirement, select it with explicit runtime, redaction, transport, and operational constraints, then update dependencies and repository guidance together.
