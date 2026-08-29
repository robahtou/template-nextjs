---
name: cache-components-fetch-policy
description: Chooses safe fetch and invalidation behavior for Next.js Cache Components. Use when adding data reads, `use cache`, cache lifetimes, tags, Suspense boundaries, or mutation invalidation.
---
# Cache Components Fetch Policy

1. Confirm `cacheComponents` is enabled in `next.config.ts`.
2. Classify each read:
   - Request-specific or authorization-sensitive: keep it uncached and perform it behind an appropriate `Suspense` boundary.
   - Stable and reusable: isolate it in the smallest `use cache` function.
3. Read dynamic request APIs outside cached scopes. Pass only the validated primitives needed to key the cached work.
4. Give cached work an explicit lifetime with `cacheLife` and tags with `cacheTag` when a mutation must invalidate it.
5. Keep one clear cache owner. Do not combine cached scopes and conflicting `fetch` cache options without a documented reason.
6. Invalidate after successful mutations at the narrowest tag or path; choose immediate consistency or stale-while-revalidate deliberately.
7. Test cold and warm reads, mutation visibility, error behavior, and cross-user or cross-tenant isolation.

Document material cache behavior in the nearest `CONTEXT.md`.

Read [policy.md](policy.md) when the change needs a cache classification or invalidation decision table.
