---
name: caching
description: Bounded process-local caching and request deduplication for server-only Node.js code.
metadata:
  tags: caching, memoization, deduplication, memory
---

# Caching

Use this reference only for explicit process-local caching in repository scripts or server-only Node.js code. Next.js Cache Components, request memoization, and application data freshness remain owned by the repository's Next.js guidance.

## Define the Contract First

Before adding a cache, define:

- the owner and process lifetime
- the complete cache key, including tenant, locale, authorization, and configuration inputs when relevant
- the maximum entry count or byte budget
- expiration and invalidation behavior
- whether stale values are allowed
- whether failures may be cached

A process-local cache is not shared across workers, deployments, or hosts. It must remain an optimization; correctness cannot depend on a later request reaching the same process.

## Keep Memory Bounded

For a small cache, a built-in `Map` with explicit limits is sufficient:

```js
function createTtlCache({ maximumEntries, ttlMilliseconds }) {
  if (!Number.isInteger(maximumEntries) || maximumEntries < 1) {
    throw new RangeError('maximumEntries must be a positive integer');
  }
  if (!Number.isFinite(ttlMilliseconds) || ttlMilliseconds <= 0) {
    throw new RangeError('ttlMilliseconds must be positive');
  }

  const entries = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    if (!entries.has(key) && entries.size >= maximumEntries) {
      entries.delete(entries.keys().next().value);
    }
    entries.set(key, {
      expiresAt: Date.now() + ttlMilliseconds,
      value
    });
  }

  return {
    clear: () => entries.clear(),
    get,
    set
  };
}
```

Use an installed, maintained cache package only when the required eviction, size accounting, or observability cannot be implemented safely with the repository's existing dependencies.

## Deduplicate In-Flight Work Separately

Request deduplication is not value caching. Track only the active promise and remove it in `finally` so rejected or completed work does not remain indefinitely:

```js
const inFlight = new Map();

async function deduplicate(key, load) {
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const pending = Promise.resolve().then(load);
  inFlight.set(key, pending);

  try {
    return await pending;
  } finally {
    if (inFlight.get(key) === pending) {
      inFlight.delete(key);
    }
  }
}
```

## Safety Rules

- Do not cache secrets, mutable authorization decisions, or user-specific data under an incomplete key.
- Do not cache rejected promises unless negative caching is explicit, short-lived, and safe.
- Do not introduce a database, external cache service, or cache dependency solely because an example uses one.
- Clear or version caches when configuration or code changes invalidate stored shapes.
- Measure hit rate, memory growth, and latency before retaining a cache.
