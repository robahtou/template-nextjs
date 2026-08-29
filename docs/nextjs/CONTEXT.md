# Next.js Context

## Baseline

This project uses the App Router. [`package.json`](../../package.json) is authoritative for framework versions, and [`next.config.ts`](../../next.config.ts) is authoritative for Cache Components and React Compiler. The standard `dev` and `build` scripts use Turbopack without redundant command flags.

Apply the Cache Components, React Compiler, and Turbopack guidance below only while the corresponding package and configuration remain enabled. Re-audit this guide whenever that baseline changes.

The framework agent-rules integration follows the enabled `agentRules` setting in `next.config.ts`. The tracked root `AGENTS.md` contains only the current framework-managed block, so Next.js recognizes the protocol before development starts and does not scaffold another root protocol file. `lint:guidance` requires that exact block. Repository-specific guidance remains owned by `.agents`, `.cursor`, and the `README.md`/`CONTEXT.md` hierarchy.

## App Router conventions

- Define URL behavior with route folders and special files such as `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `route.ts`.
- Keep layouts and pages as Server Components unless the file itself needs client-only capabilities. Put interactive client behavior in a small imported leaf.
- Prefer generated `PageProps<'/route'>`, `LayoutProps<'/route'>`, and `RouteContext<'/route'>` helpers after `pnpm typegen` instead of maintaining duplicate route parameter types.
- Treat page/layout `params`, page `searchParams`, `cookies()`, `headers()`, and `draftMode()` as asynchronous request APIs and await them. Do not preserve obsolete synchronous access.
- Use static `metadata` when values are fixed and `generateMetadata` when they depend on awaited route or server data.
- Use `redirect()` and `notFound()` in server-owned control flow. Their result is navigation, not authorization.
- Use `next/link` for application navigation and `next/image` for optimized raster images. Images need correct intrinsic dimensions or a constrained `fill` parent, an accurate `sizes` value, and meaningful `alt` text or an intentional empty `alt`.

[`src/app/CONTEXT.md`](../../src/app/CONTEXT.md) owns local route-file placement. The [route inventory](../routes/CONTEXT.md) owns access classification and route behavior.

## Cache Components and Suspense

With Cache Components enabled, design a stable prerenderable shell and isolate request-time work:

1. Keep uncached asynchronous reads behind the nearest meaningful `<Suspense>` boundary.
2. Add `'use cache'` only to deterministic server work whose result is safe to reuse for all callers represented by its arguments.
3. Do not read cookies, headers, request identity, or secrets inside a shared cache scope. Resolve request context outside it and do not cache private results without an explicit reviewed key and invalidation design.
4. Declare freshness with `cacheLife()` and invalidation ownership with `cacheTag()` rather than relying on accidental fetch behavior.
5. Use `revalidateTag(tag, 'max')` for stale-while-revalidate invalidation, `updateTag(tag)` in a Server Action when the caller must read its own write immediately, and `revalidatePath()` when route output itself must be invalidated.
6. Keep fallbacks representative and accessible. A blank fallback hides latency and makes failure diagnosis harder.

Cache tags and route invalidation never grant access. Authorization runs for every protected request even when underlying reusable data is cached.

## Server Components and Client Components

Use Server Components for initial reads, privileged integrations, large dependencies, metadata, and static composition. Add `'use client'` only for browser APIs, local interaction, effects, event handlers, or client state. The directive creates a dependency boundary: imports below it join the client graph.

Props crossing that boundary must be serializable and minimal. Keep secrets, raw privileged records, server-only modules, and authorization logic above it. Do not move a whole page to the client to support one control.

## Server Actions

Use a Server Action for a mutation initiated by this application's UI. Mark the action with `'use server'`, export only async server functions, and treat it as a remotely callable endpoint:

1. Parse and validate untrusted input.
2. Authenticate the caller and authorize the specific resource and operation.
3. Perform the mutation through a server-owned library boundary.
4. Invalidate the narrowest cache tags or paths needed.
5. Return a serializable, non-sensitive success or error result.

Progressive enhancement, pending state, duplicate submission, idempotency, and post-mutation focus or announcement behavior are part of the action's UI contract.

## Route Handlers

Use `route.ts` for genuine HTTP consumers: webhooks, machine clients, file or streaming responses, custom methods, or explicit status/header contracts. Do not introduce a Route Handler merely to let this application's Server Components call their own server; call the server-owned library directly.

Each method validates input, authenticates and authorizes independently, returns deliberate cache headers, and avoids leaking internal errors. Webhooks additionally require provider authentication, replay protection, bounded payload handling, and idempotency where delivery can repeat.

## Proxy

Use a root `proxy.ts` only for request-time rewrites, redirects, or optimistic routing that must happen before route rendering. Keep it fast and avoid database-heavy policy. Proxy may improve the user journey, but the destination page, action, handler, and data operation still enforce authorization on the server.

## React Compiler

Write pure components and hooks, follow the Rules of React, and let React Compiler provide routine memoization. Do not add `useMemo`, `useCallback`, or component memoization by habit; retain manual memoization only for a measured semantic or integration requirement. Never mutate render inputs or perform side effects during render.

When compiler behavior is suspected, capture a minimal reproducer and evidence in [diagnostics](diagnostics/CONTEXT.md) before adding an escape hatch.

## Turbopack

Turbopack is the normal development and production bundler for this baseline. Keep module resolution portable, use supported Next.js configuration, and do not add webpack-only loaders or plugins without an explicit framework-baseline change. After configuration or environment changes, reproduce issues from a clean server process before attributing them to hot refresh.

Record exact errors, minimal reproduction steps, configuration state, and dev/build differences in the [diagnostics context](diagnostics/CONTEXT.md). Promote only verified reusable conclusions to [lessons](lessons/CONTEXT.md).

## Security and accessibility

The [architecture context](../architecture/CONTEXT.md) owns the complete trust-boundary rules. In framework code:

- UI placement, Client Component checks, Proxy redirects, and hidden navigation are not authorization.
- Validate and authorize in pages, actions, handlers, and server libraries before protected data or side effects.
- Keep error payloads safe and secrets out of client bundles, HTML, logs, cache keys, and diagnostics.
- Provide semantic loading, empty, denied, error, and success states with keyboard/touch parity, visible focus, useful names, and restrained announcements.
- `error.tsx` is a recovery UI, not a place to expose stack traces or sensitive causes.

## Maintenance

Update this guide when framework configuration, router syntax, request APIs, cache behavior, invalidation, compiler behavior, bundler assumptions, or security boundaries change. Keep exact patch versions in `package.json`; include them in a diagnostic only when a dated reproduction depends on them. Verify changes with `pnpm typecheck`, `pnpm build`, and `pnpm verify`.
