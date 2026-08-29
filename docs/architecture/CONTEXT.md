# Application Architecture Context

## Principles

Keep ownership close to the behavior, render on the server by default, and make each trust boundary explicit. This greenfield template favors direct current designs over compatibility layers and does not pre-create optional architecture.

## Source placement

- [`src/app`](../../src/app/CONTEXT.md) owns URL structure, App Router special files, metadata, loading/error states, and route handlers.
- A route's `_components` folder owns UI private to that route tree. The root example is [`src/app/_components`](../../src/app/_components/CONTEXT.md).
- [`src/components`](../../src/components/CONTEXT.md) owns React UI proven to be shared across routes.
- [`src/lib`](../../src/lib/CONTEXT.md) owns cohesive application services, external integrations, and application policy.
- [`src/utils`](../../src/utils/CONTEXT.md) owns small, pure, platform-neutral helpers.
- [`src/assets`](../../src/assets/CONTEXT.md) owns static resources imported by the build.

When a downstream domain becomes large enough to own multiple routes, UI pieces, services, and types, move that cohesive implementation to `src/features/<domain>`. Do not create `features`, `server`, `hooks`, `types`, provider, auth, database, or test-framework folders before real code needs them.

## Server and client boundary

Server Components are the default for layouts, pages, initial reads, secret-bearing integrations, and composition. Add `'use client'` at the smallest interactive leaf that requires browser APIs, effects, event handlers, local state, or client-only context.

Only serializable, least-privilege data crosses from server to client. Never pass secrets, privileged records, authorization decisions, or unsanitized error objects to a Client Component. A client guard, hidden control, disabled button, or route redirect improves experience but never enforces access.

## Reads, mutations, and HTTP

1. Authenticate and authorize server reads before retrieving protected records.
2. Validate route parameters, search parameters, cookies, headers, form data, and external responses at their server boundary.
3. Use a Server Action for a mutation initiated by this application's UI. Treat every action as independently callable: validate, authorize, perform the mutation, invalidate only affected data, and return a safe result.
4. Use a Route Handler when a genuine HTTP consumer needs a method, status code, headers, streaming response, webhook, or machine-readable contract.
5. Keep provider SDK details in `src/lib`; expose narrow application operations to routes and actions.

The [Next.js context](../nextjs/CONTEXT.md) owns framework syntax, Cache Components, invalidation APIs, Proxy, Turbopack, and React Compiler conventions.

## Cache ownership

Every cached read needs an owner, freshness expectation, cache key inputs, invalidation trigger, and safe behavior after invalidation fails. Never include request-specific credentials or authorization state in a shared cache key. Cache only after access and tenancy boundaries are understood.

Document route-level rendering and cache choices in the [route inventory](../routes/CONTEXT.md). Record reusable framework findings in [Next.js lessons](../nextjs/lessons/CONTEXT.md).

## Styling

Route and component styles use colocated `styles.module.css` files. Shared tokens and intentional global behavior live in the [global style system](../../src/assets/styles/CONTEXT.md). Replacing CSS Modules is an explicit dependency, configuration, implementation, and guidance change.

## Security boundary

- Deny access on the server before protected data or side effects.
- Use narrowly scoped environment variables and keep privileged modules out of client imports.
- Defend state-changing HTTP endpoints against replay, forged origin, and duplicate delivery as their threat model requires.
- Avoid logging credentials, cookies, raw authorization headers, sensitive form fields, or full third-party payloads.
- Fail closed for authorization and return stable, non-sensitive errors.

Every route is classified as public, authenticated, anonymous-only, or intentionally unreachable. Classification does not replace resource-level authorization.

## Accessibility boundary

UI acceptance includes semantic HTML, useful names and descriptions, keyboard and touch parity, visible focus, non-nested interactive controls, sufficient state communication, correct dialog focus behavior, and restrained live regions. Loading, error, empty, denied, and success states must remain understandable without color or pointer-only interaction.

## Maintenance

Update this guide only when placement, boundary flow, caching, security, or cross-cutting accessibility responsibilities change. Update the closest folder context for local changes and the route inventory whenever a route's access, rendering, data, mutation, or failure contract changes.
