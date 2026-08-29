# Application Library Context

## Ownership

`src/lib` owns cohesive application services, external integrations, server operations, and shared application policy. Examples include validated environment access, API clients, persistence adapters, cache-aware reads, mutation services, and runtime-neutral policy constants.

Small platform-neutral helpers belong in [`src/utils`](../utils/CONTEXT.md). React presentation belongs in route-private or [shared components](../components/CONTEXT.md).

## Boundary rules

- Expose narrow operations named for application intent rather than leaking provider SDKs into routes.
- Keep secret-bearing and privileged modules server-only and outside every Client Component dependency graph.
- Separate browser-safe policy modules from server integrations so a shared import cannot pull secrets or Node-only code into the client bundle.
- Validate environment and third-party data at the point it enters the application.
- Translate provider failures into stable application errors; do not return raw responses, stack traces, credentials, or sensitive payloads.
- Make network, storage, time, randomness, and logging side effects explicit.

## Reads, writes, and caching

Pages, Server Actions, and Route Handlers call library operations directly. A UI-owned Server Action and an HTTP Route Handler may share the same operation, but each boundary still validates transport input and authorizes its caller.

For every protected operation, authenticate and authorize before returning data or causing a side effect. For every cached read, define callers represented by the key, freshness, tags, invalidation triggers, and failure behavior. Never share cached private data across users or tenants through an incomplete key.

## Extension

Group a few related modules under a descriptive subfolder when they share one integration or policy. When a downstream domain grows to own routes, UI, services, and types together, move that cohesive implementation to `src/features/<domain>`; do not use `lib` as an unstructured feature dump.

Do not add placeholder clients, repositories, auth modules, or provider wrappers. This greenfield template adds an integration only with a real consumer and configuration contract.

## Maintenance

See the [architecture context](../../docs/architecture/CONTEXT.md) for server/client/action/handler boundaries and the [Next.js context](../../docs/nextjs/CONTEXT.md) for cache APIs. Update this guide when service ownership, trust boundaries, cache policy, or feature-promotion rules change.
