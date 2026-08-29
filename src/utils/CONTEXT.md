# Utility Context

## Ownership

`src/utils` owns small, pure, platform-neutral functions that are useful across unrelated application areas. A utility has explicit inputs and outputs, no hidden runtime dependency, and no application workflow.

Use [`src/lib`](../lib/CONTEXT.md) for services, integrations, environment access, domain policy, caching, or side effects.

## Admission criteria

A module belongs here only when it:

- is deterministic for the same inputs;
- does not read environment variables, storage, network state, clocks, randomness, React context, or request state;
- does not import Next.js, React, browser-only, Node-only, or provider SDK APIs;
- has a narrow name and type contract;
- remains meaningful outside a single route or feature.

Pure parsing, formatting, assertion, and immutable transformation helpers can fit. Authorization, provider error mapping, server validation workflows, hooks, and UI helpers do not.

## Design rules

- Prefer a focused function over a catch-all helper module.
- Return new values instead of mutating caller-owned input.
- Make locale, timezone, comparison, and fallback behavior explicit when they affect output.
- Handle edge cases at the type boundary and document surprising behavior next to the function.
- Keep security decisions at the server boundary even when they use a pure predicate internally.

If a helper gains I/O, framework imports, product policy, or coordinated workflow, move it to the owning route, library, or future feature folder. If only one caller remains, colocate it with that caller.

## Maintenance

See the [architecture context](../../docs/architecture/CONTEXT.md) for source placement. Update this guide only when utility admission or purity rules change; adding an ordinary conforming helper does not require a documentation edit.
