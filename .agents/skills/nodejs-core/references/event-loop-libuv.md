---
name: event-loop-libuv
description: Event-loop, callback, and shared libuv thread-pool diagnosis for Node.js 26.
metadata:
  tags: event-loop, libuv, thread-pool, latency, utilization
---

# Event Loop and libuv

## Correlate independent signals

Measure a bounded interval with both `monitorEventLoopDelay()` and `performance.eventLoopUtilization()`. Event-loop delay is a nanosecond histogram; utilization is the fraction of time outside the event provider. Neither identifies the blocking function, so correlate them with a CPU profile and operation latency.

```javascript
import {
  monitorEventLoopDelay,
  performance
} from 'node:perf_hooks';

const delay      = monitorEventLoopDelay({ resolution: 20 });
const previous   = performance.eventLoopUtilization();
delay.enable();

await runRepresentativeWorkload();

const utilization = performance.eventLoopUtilization(previous);
delay.disable();

console.log({
  eventLoopP99Milliseconds: delay.percentile(99) / 1e6,
  eventLoopUtilization: utilization.utilization
});
```

Interpret the combination:

- High delay and high utilization: inspect synchronous work, CPU-heavy callbacks, oversized callback batches, serialization, and GC pauses. If the CPU or GC profile explains the stall, keep the optimization at that application or V8 boundary rather than classifying it as a libuv issue.
- High request latency with low event-loop pressure: inspect external I/O, queueing, backpressure, and downstream capacity.
- Delayed filesystem, `dns.lookup()`, selected crypto, compression, or addon work with a responsive loop: test shared libuv thread-pool saturation.
- Many resources keeping the process alive: use public `process.getActiveResourcesInfo()` for a coarse inventory, then inspect the owning lifecycle.

Do not use private `_getActiveHandles()`, `_getActiveRequests()`, `process.binding()`, or a hand-written phase diagram as production diagnostics.

## Diagnose the shared thread pool

libuv uses a process-wide pool for operations that lack a direct non-blocking operating-system path. The exact users and implementation are runtime-dependent; verify the active Node and dependency behavior. Network socket readiness normally uses the platform event provider rather than this pool.

Treat `UV_THREADPOOL_SIZE` as a startup-only diagnostic variable. Compare explicit sizes under the same workload while recording throughput, tail latency, CPU, memory, and unrelated pool users. A larger pool can increase memory and scheduling contention; never select a value from CPU count or request concurrency alone.

Worker isolates have separate event loops but do not imply an independent libuv pool. Moving the same pool-backed operation into a worker may leave the bottleneck unchanged.

## Fix the verified boundary

- Main-thread CPU or synchronous work: reduce it, partition it, or consider a worker only when [Workers and native boundaries](workers-native.md) shows the transfer economics are favorable.
- Pool saturation: bound producer concurrency, reduce unnecessary operations, batch safely, or isolate competing workloads at an architecture boundary.
- Callback flooding: add bounded queues and backpressure rather than scheduling more callbacks.
- GC-related delay: follow [Memory and GC](memory-gc.md).

Re-measure the complete request or task path. Improved event-loop metrics without improved user-visible work are not sufficient.
