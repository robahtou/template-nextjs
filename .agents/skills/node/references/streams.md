---
name: streams
description: Backpressure-safe Node and Web Stream handling at server boundaries
metadata:
  tags: streams, pipeline, backpressure, web-streams, nextjs
---

# Node.js Streams

## Prefer pipeline

Use the promise-based `pipeline()` for Node stream composition. It propagates errors, observes backpressure, and tears down the chain:

```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const inputUrl = new URL('./input.ndjson', import.meta.url);
const outputUrl = new URL('./input.ndjson.gz', import.meta.url);

await pipeline(
  createReadStream(inputUrl),
  createGzip(),
  createWriteStream(outputUrl),
  { signal: AbortSignal.timeout(30_000) },
);
```

Validate externally supplied paths before opening them. A script-relative URL is safe only for project-owned fixed assets.

## Transform incrementally

Async generators are sufficient for many transforms and require no stream utility dependency:

```javascript
async function* decodeUtf8(source) {
  const decoder = new TextDecoder();

  for await (const chunk of source) {
    yield decoder.decode(chunk, { stream: true });
  }

  yield decoder.decode();
}
```

Preserve decoder state across chunks. Buffering each chunk independently can corrupt multi-byte characters, and concatenating all chunks defeats streaming.

When writing directly rather than through `pipeline()`, respect a `false` return from `write()` and wait for `drain` with `once()` before continuing. Register completion and error observation before triggering the operation.

## Node streams and Web Streams

Fetch, `Request`, and `Response` use Web Streams. Filesystem, compression, and many Node APIs use Node streams. In the Node.js server runtime, convert explicitly with `Readable.fromWeb()` or `Readable.toWeb()` when necessary, and handle a nullable response body.

Do not pass a Node stream into a Client Component, serialize it as a prop, or assume Node stream adapters exist in an Edge runtime. Keep conversion and consumption inside the server boundary.

## Resource limits

- Prefer incremental parsing for large or untrusted bodies.
- Enforce byte, record, and time limits before accumulating content.
- Propagate an `AbortSignal` through every stage that accepts one.
- Close upstream resources when downstream work fails or the client disconnects.
- Use `node:stream/consumers` only when the complete, bounded body is intentionally held in memory.
