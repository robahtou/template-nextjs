---
name: nodejs-core
description: Diagnoses and optimizes measured low-level Node.js 26 bottlenecks involving V8 JIT or GC, libuv scheduling or thread-pool behavior, worker isolates, and native memory or addons. Use only after evidence identifies a runtime-internals boundary; do not use for routine Node scripts, normal application work, or generic performance requests.
---

# Node.js Runtime Internals

Use `$node` for ordinary scripts, subprocesses, filesystem work, streams, and initial performance measurement. Apply this skill only when a reproducible profile or runtime metric points below the application-level design.

1. Record `process.version` and the runtime provenance used by the representative deployment, then compare them with the exact Node 26 runtime pinned in `package.json`. Treat a mismatch as a separate finding. Record `process.versions.v8`, `process.versions.uv`, and `process.versions.napi` when those layers matter.
2. Reproduce the issue with fixed input, concurrency, warm-up, duration, and production-equivalent execution. Separate application, framework, and runtime effects.
3. Classify the evidence as CPU/JIT, managed-memory/GC, event-loop/libuv, worker-isolate, or native-addon behavior before changing code or runtime flags.
4. Change one cause at a time. Preserve correctness checks and compare multiple before/after samples; reject changes within measurement variance.
5. Treat V8 flags, private internals, and native debugging as diagnostic tools. Verify every flag against the active runtime and do not ship private bindings, native syntax, or undocumented engine assumptions.

## Focused references

Read only the reference matching the confirmed signal:

- [Runtime profiling](references/runtime-profiling.md) to capture and classify low-level evidence.
- [V8 and JIT](references/v8-jit.md) when a dominant JavaScript CPU hotspot has warm-up-dependent behavior or optimization/deoptimization evidence to collect or interpret.
- [Memory and GC](references/memory-gc.md) for heap growth, allocation pressure, GC pauses, external memory, or unexplained RSS.
- [Event loop and libuv](references/event-loop-libuv.md) for event-loop delay, utilization, or shared thread-pool saturation.
- [Workers and native boundaries](references/workers-native.md) when measured CPU work may justify an isolate pool or evidence points to native code, native memory, or an addon crash.

Keep generated profiles, snapshots, reports, and traces in a temporary or ignored location. They can contain source paths, payload fragments, environment data, and secrets; review them before sharing.
