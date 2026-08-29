---
name: graceful-shutdown
description: Built-in signal, cancellation, and cleanup patterns for long-running Node.js processes.
metadata:
  tags: shutdown, signals, cleanup, subprocesses
---

# Graceful Shutdown

Apply this reference only to a standalone long-running Node.js process that owns resources. Next.js owns the lifecycle of route handlers, Server Components, and the generated standalone server; do not install application-level signal handlers inside request modules.

## Define Ownership

Before adding shutdown behavior, list the resources the entry point owns: servers, subprocesses, file watchers, streams, timers, and external clients. Cleanup must be idempotent, bounded, and performed in reverse ownership order where dependencies require it.

## Use Built-In Signal Handling

```js
import { setTimeout as delay } from 'node:timers/promises';

const shutdownController = new AbortController();
let shutdownPromise;

async function closeResources() {
  shutdownController.abort();
  await closeOwnedServer();
  await closeOwnedChildProcess();
}

async function shutdown(signal) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = Promise.race([
    closeResources(),
    delay(10_000, undefined, { ref: false }).then(() => {
      throw new Error('Shutdown deadline exceeded');
    })
  ]);

  try {
    await shutdownPromise;
  } catch (error) {
    console.error(`process-name: shutdown after ${signal} failed`, {
      cause: error
    });
    process.exitCode = 1;
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}
```

Adapt the deadline and exit-code contract to the owning command. Do not call `process.exit()` while asynchronous cleanup or output is pending.

## Subprocesses

- Spawn with shell execution disabled and retain the child handle.
- Decide whether the parent forwards a signal, requests protocol-level shutdown, or terminates after a deadline.
- Await `exit` and inspect both code and signal.
- Do not assume killing the parent terminates an entire process tree on every platform.

## Cancellation and Health

- Abort new work before draining active work.
- Pass a shared `AbortSignal` only to operations owned by the process.
- Stop reporting readiness before a server begins draining when the deployment contract provides a readiness check.
- Keep shutdown logging concise and free of credentials or complete environment objects.

Do not add a shutdown package, database client, container delay, or framework integration unless the project actually installs and owns it.
