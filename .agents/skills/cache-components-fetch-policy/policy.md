# Cache Classification Reference

Use this reference only after confirming that `cacheComponents` remains enabled in `next.config.ts`.

## Read classification

| Class | Reuse boundary | Implementation |
| --- | --- | --- |
| Shared | Every caller represented by the function arguments may receive the same value | Isolate the deterministic read in a `'use cache'` function with an explicit `cacheLife()` and stable `cacheTag()` values. |
| Scoped | Reuse is safe only for a validated user, tenant, locale, or resource scope | Pass every scope value as a function argument, keep request APIs outside the cached function, and use scoped tags with controlled cardinality. |
| Volatile | Freshness, privacy, or one-time semantics prohibit reuse | Keep the read uncached and place the asynchronous request-time work behind an appropriate `Suspense` boundary. |

Treat authorization-sensitive work as volatile unless a reviewed design proves that the cache key, result, lifetime, and invalidation cannot cross identities or scopes. Cache tags organize freshness; they do not authorize access.

## Invalidation choice

| Mutation boundary | Required visibility | API |
| --- | --- | --- |
| Server Action | The initiating UI must read its own successful write immediately | `updateTag(tag)` |
| Route Handler or external trigger | Stale-while-revalidate is acceptable | `revalidateTag(tag, 'max')` |
| Route output changed independently of a reusable data tag | The affected route must be regenerated | `revalidatePath(path)` |

- Invalidate only after the mutation succeeds.
- Use stable resource and scope identifiers; never build tags from secrets, timestamps, random values, or unbounded user input.
- Keep the read and write paths on the same tag namespace.
- Do not combine a cached function with conflicting `fetch` cache options unless the nearest `CONTEXT.md` explains the ownership.

## Review record

For each changed read or write, record its location, classification, cache owner, lifetime, tags, invalidation owner, and the cold/warm/mutation/isolation checks that prove the design.
