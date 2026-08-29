---
name: profiling
description: Built-in Node.js profiling and reproducible benchmark workflow
metadata:
  tags: profiling, cpu, heap, diagnostics, benchmarking
---

# Profiling in Node.js

## Reproduce first

Capture the active runtime with `node --version` and confirm the package manager against the root `packageManager` field; both must match `package.json`. Fix the input, concurrency, environment, warm-up, and run duration. For Next.js request behavior, build with `pnpm build` and exercise `pnpm build:start` rather than treating development timings as production data.

Profiles can contain source paths, environment values, payload fragments, and secrets. Store them in a temporary or ignored directory and review them before sharing.

## CPU profiles

Node can emit a Chrome DevTools-compatible CPU profile without another package:

```bash
mkdir -p /tmp/template-nextjs-profiles
node --cpu-prof --cpu-prof-dir=/tmp/template-nextjs-profiles scripts/lint/guidance.mjs
```

Run the exact slow workload while profiling. Inspect self time, total time, call count, garbage-collection activity, and whether the hotspot is project code, framework code, or I/O waiting.

For an interactive investigation, start the relevant process with `--inspect` or `--inspect-brk` and attach a local DevTools client. Do not expose the inspector port on an untrusted interface.

## Heap and process diagnostics

Use built-in heap profiling for growth or allocation questions:

```bash
node --heap-prof --heap-prof-dir=/tmp/template-nextjs-profiles scripts/lint/guidance.mjs
```

Useful additional signals include:

- `process.memoryUsage()` for sampled resident-set and heap trends.
- `process.getActiveResourcesInfo()` for resources keeping a process alive.
- `--trace-gc` for garbage-collection investigation.
- `--report-on-fatalerror` and `--report-directory` for fatal diagnostic reports.

Diagnostic flags add overhead and may change timing. Enable only the signal required by the current hypothesis.

## Event-loop delay

Use `node:perf_hooks` for targeted measurements:

```javascript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const delay = monitorEventLoopDelay({ resolution: 20 });
delay.enable();

await runRepresentativeWorkload();

delay.disable();
console.log({
  meanMs: delay.mean / 1e6,
  p99Ms: delay.percentile(99) / 1e6,
});
```

## Comparison discipline

Warm up both variants, collect multiple samples, compare medians and tail behavior, and change one variable at a time. Include correctness checks in the workload. A faster result is not valid if it drops work, changes caching state, or bypasses the production execution path.
