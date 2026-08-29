---
name: runtime-profiling
description: Evidence capture and classification for low-level Node.js 26 runtime investigations.
metadata:
  tags: profiling, cpu, heap, diagnostics, benchmarking
---

# Runtime Profiling

## Escalation gate

Start here only after ordinary application profiling establishes a repeatable problem. Record:

- the exact runtime, command, build mode, input, concurrency, warm-up, and sample duration
- throughput and median/tail latency or task duration
- process CPU, RSS, V8 heap, external memory, event-loop delay, and event-loop utilization when relevant
- whether the hotspot is JavaScript, garbage collection, a native frame, blocking work, or waiting outside the process

Do not infer a runtime cause from wall-clock time alone. Development compilation, remote latency, queueing, and application algorithms can resemble engine problems.

## Built-in captures

Use an explicit temporary or ignored output directory. Confirm supported options with `node --help` before capture.

```bash
node --cpu-prof --cpu-prof-dir=/absolute/ignored/diagnostics entry.mjs
node --heap-prof --heap-prof-dir=/absolute/ignored/diagnostics entry.mjs
```

The CPU profile is the primary evidence for on-CPU work. The sampling heap profile locates allocation sources with less disruption than a full heap snapshot. Use the inspector only on a trusted interface and only when an interactive capture is required.

`--cpu-prof` covers the process lifetime, so it can blend startup, warm-up, and degraded steady state. For a phase-dependent regression, use separate controlled runs that isolate comparable windows or a trusted local inspector session that starts and stops profiling around explicit pre-regression and post-regression phases. Do not expose the inspector on an untrusted interface. Compare multiple phase-aligned samples rather than one blended profile.

For crashes or fatal runtime failures, use Node's diagnostic-report flags and an explicit report directory. Reports can include environment, network, stack, and system data; use the exclusion flags appropriate to the incident before sharing.

## Classify before escalating

| Evidence | Next reference |
| --- | --- |
| Dominant JavaScript frames with a repeatable warm-up regression or optimization/deoptimization evidence to collect or interpret | [V8 and JIT](v8-jit.md) |
| Growing `heapUsed`, allocation-heavy profiles, or material GC time | [Memory and GC](memory-gc.md) |
| Event-loop delay unexplained by JavaScript or GC profiles, or delayed libuv-backed operations with thread-pool evidence | [Event loop and libuv](event-loop-libuv.md) |
| A sustained CPU hotspot large enough to amortize isolate messaging | [Workers and native boundaries](workers-native.md) |
| Native frames, stable V8 heap with growing RSS, an addon crash, or ABI failure | [Workers and native boundaries](workers-native.md) |

I/O wait without event-loop or thread-pool evidence remains an application or external-system investigation.

## Comparison discipline

- Capture multiple samples of the same workload; profiles and tracing perturb execution.
- Compare the same runtime, build, machine class, input, concurrency, and cache state.
- Optimize the widest verified stack in a profile, not an isolated function that happens to look complex.
- Retain raw evidence and the exact command alongside the conclusion.
- Require correctness, resource bounds, and tail behavior to remain acceptable after an optimization.
