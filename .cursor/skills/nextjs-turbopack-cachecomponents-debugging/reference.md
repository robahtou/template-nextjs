# Turbopack and Cache Components Diagnostic Reference

## Isolation matrix

Capture the smallest set of comparisons that separates application behavior from generated state or tooling behavior:

| Mode | Relevant feature state | Browser connected | Observation |
| --- | --- | --- | --- |
| Development with the configured bundler | Live `next.config.ts` | No | Record idle CPU, logs, and compilation state. |
| Development with the configured bundler | Live `next.config.ts` | Yes | Record request, HMR, and repeated-compilation behavior. |
| Clean development state | Live `next.config.ts` | Yes | Compare after preserving evidence and regenerating `.next`. |
| Production build and standalone server | Live `next.config.ts` | Yes | Determine whether the failure is development-only. |

Use temporary feature toggles only when one configured option is the suspected boundary. Change one variable, record the result, then restore the repository baseline. Do not commit a disabled compiler, cache, or bundler feature as a diagnostic workaround.

## Evidence to retain

- Exact command and whether it starts development or the standalone production server.
- Pinned framework/runtime versions from manifests and the relevant `next.config.ts` fields.
- Minimal route or module that triggers the problem, exact error, and whether a browser connection is required.
- Cold versus warm behavior, whether `.next` regeneration changes the result, and whether the issue reproduces after a clean restart.
- CPU or memory observations only when collected with the same workload and without profiling overhead in the baseline.
- The first meaningful server, browser, or build error rather than repeated secondary failures.

## Classification

- Production and clean development both fail: investigate application code or supported configuration first.
- Production succeeds but development repeatedly recompiles: investigate HMR, invalidation, module graph, or generated development state.
- Only request-specific cached work fails: inspect dynamic API placement, cache arguments, serialization, and `Suspense` ownership.
- Regenerating `.next` fixes one run but the issue returns reproducibly: generated state is a symptom; continue isolating the trigger.

Escalate upstream only with a minimal reproduction, the isolation matrix, exact version/configuration evidence, and confirmation that the failure survives a clean supported setup.
