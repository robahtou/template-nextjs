---
name: memory-gc
description: V8 heap, garbage-collection, external-memory, and RSS diagnosis for Node.js 26.
metadata:
  tags: memory, v8, gc, heap, rss, native-memory
---

# Memory and Garbage Collection

## Identify the memory domain

Sample after warm-up under a fixed workload. One reading is not a leak.

| Signal | Meaning |
| --- | --- |
| `heapUsed` / `heapTotal` | Managed V8 heap for the current isolate. |
| `external` | Memory associated with JavaScript objects but allocated outside the V8 heap. |
| `arrayBuffers` | ArrayBuffer and SharedArrayBuffer storage included within the external-memory domain. |
| `rss` | Resident memory for the entire Node process, including JavaScript, native allocations, code, stacks, and workers. |
| V8 heap-space statistics | Generation/space pressure within the current isolate. |

Use `process.memoryUsage()`, `process.memoryUsage.rss()`, `v8.getHeapStatistics()`, and `v8.getHeapSpaceStatistics()` as sampled signals. Avoid high-frequency collection that changes the workload being measured.

Interpret trends:

- Rising `heapUsed` across comparable completed cycles suggests retained JavaScript objects.
- Stable retained heap with high allocation rate and frequent pauses suggests allocation churn rather than a leak.
- Stable V8 heap with rising `external`, `arrayBuffers`, or RSS points toward buffers, workers, native allocations, fragmentation, or another process-level domain.
- A main-isolate snapshot contains no worker-isolate heap; capture each relevant worker separately.

## Choose the least disruptive capture

Use a sampling heap profile to locate allocation sites before taking full snapshots:

```bash
node --heap-prof --heap-prof-dir=/absolute/ignored/diagnostics entry.mjs
```

Use `--trace-gc` or another flag listed by the active `node --v8-options` only when pause frequency or reclamation is the hypothesis. Correlate trace timestamps with workload latency; do not optimize from collector names alone.

Heap snapshots are synchronous, isolate-specific, and can require roughly twice the current heap, causing long event-loop stalls or process termination. Take them only in a controlled reproduction or disposable replica with enough memory. Compare equivalent lifecycle points and inspect retaining paths, not just shallow size.

## Correct the owning cause

- Bound caches, queues, listeners, timers, and buffered output; remove references at the lifecycle boundary that owns them.
- Reduce verified allocation churn without introducing unsafe pooling or mutable shared state.
- Keep stream and buffer sizes bounded; respect backpressure.
- For native allocations, verify lifetime ownership and external-memory accounting in [Workers and native boundaries](workers-native.md).
- Treat a larger old-space limit as a capacity decision, not a leak repair.

Do not add `global.gc()` to production control flow, rely on finalizer timing, or use `WeakRef` as deterministic resource cleanup. Re-run the same load long enough to cross multiple allocation and collection cycles after the fix.
