---
name: node
description: Guides robust Node.js ESM for repository scripts and server-only Node code. Use when editing .mjs scripts, subprocesses, filesystem operations, or Node runtime boundaries.
---
# Node

1. Confirm the exact supported runtime in `package.json`.
2. Use ESM and `node:` imports for built-in modules.
3. Prefer `async` functions and `await` existing promise-returning APIs. Use `node:events` `once()` for one-shot events; construct a `new Promise` only when adapting an API with no promise alternative, and document why it is necessary.
4. Resolve script-relative assets from `import.meta.url`; rely on the working directory only when the command contract guarantees the project root.
5. Pass dynamic subprocess arguments as an array with shell execution disabled. Set finite timeouts for bounded work and inspect errors, status, and signals.
6. Validate filesystem paths before access, including real paths when symlinks could cross a trust boundary.
7. Handle expected failures deliberately; otherwise preserve the original error as `cause`.
8. Keep Node-only APIs out of Client Components and browser bundles.

Prefer built-in APIs when they make the implementation simpler. Add dependencies only when their maintenance and security cost is justified.

## Focused references

Read only the references needed for the current task:

- [Async patterns](references/async-patterns.md) and [error handling](references/error-handling.md) for concurrency, cancellation, and failure propagation.
- [Modules](references/modules.md) and [TypeScript](references/typescript.md) for ESM, script-relative paths, and the boundary between Node-run tooling and Next.js-compiled code.
- [Environment](references/environment.md) and [logging](references/logging.md) for configuration, secrets, and operational output.
- [Streams](references/streams.md), [caching](references/caching.md), and [graceful shutdown](references/graceful-shutdown.md) for resource lifecycles.
- [Testing](references/testing.md) and [flaky tests](references/flaky-tests.md) for deterministic `node:test` coverage.
- [Performance](references/performance.md) and [profiling](references/profiling.md) only after a measurable runtime problem exists.
- [Dependency exploration](references/node-modules-exploration.md) when installed package behavior must be verified locally.
