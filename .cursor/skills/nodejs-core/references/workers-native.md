---
name: workers-native
description: Evidence gates for worker isolates, native addons, native memory, and crash diagnosis in Node.js 26.
metadata:
  tags: worker-threads, native-addons, node-api, native-memory, crashes
---

# Workers and Native Boundaries

## Choose an escalation from evidence

| Evidence | Appropriate direction |
| --- | --- |
| Sustained JavaScript CPU work with coarse independent tasks | Benchmark a bounded worker pool. |
| Mostly I/O wait or short tasks | Keep the simpler asynchronous design; worker startup and messaging are overhead. |
| Saturated libuv pool | Do not assume workers create another pool; diagnose the shared pool first. |
| Native frames, addon crash, ABI error, or RSS growth outside V8 domains | Inventory and isolate the native boundary. |

Workers run separate V8 isolates and event loops in one process. They add startup, heap, serialization, scheduling, and shutdown cost. Reuse a bounded pool, bound its queue, propagate cancellation and failures, and make shutdown deterministic. Batch work or transfer an owned `ArrayBuffer` only when measurement shows cloning is material; do not introduce shared memory or `Atomics` without a synchronization design and contention tests.

The pinned Node 26 worker API can observe a running worker from its owner with worker CPU usage, event-loop utilization, CPU profiles, heap statistics, and isolate-specific heap snapshots. Use the least disruptive signal first and handle the worker-not-running case. Worker resource limits constrain selected V8 domains; they are not a complete process, native-memory, or queue limit.

## Verify the native boundary

Before changing native code:

1. Identify the actual `.node` module and owning package; do not infer an addon from a native-looking stack frame.
2. Record the exact Node, V8, libuv, platform, architecture, addon version, and `process.versions.napi` values.
3. Reproduce with the smallest input and determine whether the failure is ABI loading, lifetime/ownership, thread affinity, memory safety, or native CPU work.
4. Prefer the ABI-stable Node-API for a new boundary. Do not introduce direct V8 APIs, legacy addon abstractions, or a C++ wrapper dependency unless the project explicitly selects and installs it.

For implementation or review, require explicit ownership of every allocation, buffer view, persistent reference, async request, and thread-safe callback. Use RAII in C++, keep JavaScript values on their owning isolate thread, report material external allocations through the supported Node-API mechanism, and release resources on success, failure, cancellation, and environment teardown.

## Crash and memory diagnostics

Start with a Node diagnostic report and a symbolized native stack. Use a debug-symbol build, LLDB/GDB, AddressSanitizer, or platform tracing only in an authorized isolated reproduction; these tools materially change timing and resource use. Do not attach to or terminate a live process without explicit authority.

Validate fixes across normal completion, cancellation, worker termination, repeated load/unload where supported, and every required platform/architecture. A native optimization must improve the end-to-end profile enough to justify its ABI, build, security, and maintenance cost.
