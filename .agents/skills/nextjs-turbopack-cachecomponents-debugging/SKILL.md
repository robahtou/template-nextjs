---
name: nextjs-turbopack-cachecomponents-debugging
description: Diagnoses Next.js issues involving Turbopack, Cache Components, React Compiler, or stale development output. Use for inconsistent dev/build behavior, cache surprises, or compiler-sensitive failures.
---
# Next.js Turbopack and Cache Debugging

1. Record the exact command, pinned versions, `next.config.ts`, error, and smallest reproduction.
2. Reproduce once in development and once in a clean production build when the symptom permits.
3. Identify the failing boundary: module resolution, server/client graph, dynamic request API, cached scope, invalidation, compiler transform, or stale generated output.
4. Add focused observations before changing configuration. Compare cold/warm requests and inspect whether the expected function actually reruns.
5. Change one variable at a time. Temporary feature toggles are diagnostic experiments, not final fixes; restore the configured baseline afterward.
6. Clear generated caches only after preserving evidence, then compare the result with the warm-cache case.
7. Fix the smallest root cause and run `pnpm typecheck`, `pnpm build`, and a targeted runtime check.
8. Record a reusable lesson only when the cause and resolution are confirmed.

Do not add a permanent webpack fallback or disable Cache Components or React Compiler to conceal an unresolved defect.

Read [reference.md](reference.md) when a reproducible issue needs an isolation matrix or upstream-report evidence.
