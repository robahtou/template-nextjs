---
name: performance
description: Built-in-first Node.js performance practices for scripts and server runtime code
metadata:
  tags: performance, event-loop, memory, worker-threads, nextjs
---

# Performance in Node.js

## Measure the relevant path

Establish a reproducible baseline before optimizing. Record the Node.js version, input size, concurrency, build mode, and representative workload. Measure production Next.js output for request-path conclusions; development mode includes compiler and diagnostic overhead.

Use [`profiling.md`](./profiling.md) to locate CPU, allocation, or event-loop pressure. Do not add a dependency until built-in diagnostics show a gap that justifies it.

## Protect the event loop

- Use promise-based filesystem and network APIs in concurrent server paths.
- Avoid synchronous filesystem calls, large JSON parsing, compression, and CPU-heavy loops in request handling.
- A small, bounded synchronous operation can be acceptable in a one-shot repository script when it makes failure handling clearer; measure it if script latency matters.
- `async` does not make CPU work non-blocking. Move sustained CPU work to `node:worker_threads` after measurement, and account for worker startup and data-transfer costs.
- Bound fan-out. Do not pass an unbounded input collection directly to `Promise.all()`.

Apply finite cancellation to bounded remote work:

```javascript
const response = await fetch(url, {
  signal: AbortSignal.timeout(5_000),
});
```

Check `response.ok`, cap response sizes when the peer is not trusted, and preserve the abort or network error as the failure cause.

## Bound memory and resources

- Give in-process caches explicit entry, byte, and lifetime limits.
- Remove event listeners and timers when their owner is released.
- Close file handles, streams, workers, subprocesses, and servers on every completion path.
- Stream large payloads instead of buffering them wholesale.
- Avoid retaining request objects, response bodies, or large closures in module-level state.

A process-local `Map` is not a durable or shared Next.js cache. Use framework cache semantics for application data and assume that multiple server processes may exist.

## Optimize the actual bottleneck

Prefer algorithmic and allocation reductions over micro-optimizations. Keep hot-path logging small, serialize only required fields, and reuse immutable configuration. Re-run the same workload after each change and reject changes whose gain is within measurement variance.
