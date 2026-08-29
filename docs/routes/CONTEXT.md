# Route Classification and Inventory

## Purpose

This file is the canonical inventory for user-visible routes and Route Handler surfaces. Add a record in the same change that adds or materially changes a route.

Implementation belongs under [`src/app`](../../src/app/CONTEXT.md). Cross-cutting trust boundaries belong in the [architecture context](../architecture/CONTEXT.md), and framework behavior belongs in the [Next.js context](../nextjs/CONTEXT.md).

## Access classes

Every route chooses exactly one primary class:

- **Public:** available without an authenticated identity. Protected resources referenced by the route still require server authorization.
- **Authenticated:** requires a valid identity and resource-specific authorization enforced before protected data is read or mutated.
- **Anonymous-only:** intended for signed-out visitors. Redirect signed-in users on the server, but do not treat this classification as protection for sensitive data.
- **Intentionally unreachable:** should not produce navigable application UI in the deployed state. Remove it or return a server-owned not-found response; path obscurity is not a security control.

Classify Route Handler methods independently when methods have different consumers or credentials. Proxy redirects, navigation visibility, and Client Component checks never satisfy the enforcement field.

## Route record schema

Each route record includes:

1. URL pattern and App Router entry files.
2. Primary access class and the exact server enforcement point.
3. User purpose and owning feature or source folder.
4. Dynamic parameters, search parameters, cookies, headers, body data, and external inputs.
5. Rendering mode, Suspense boundaries, cache scope, freshness, tags, and invalidation triggers.
6. Server data dependencies and the minimum data sent to Client Components.
7. Server Actions and Route Handler methods, including input validation, authorization, idempotency, and safe error behavior.
8. Redirect, loading, empty, denied, not-found, error, and success states.
9. Metadata, indexing, canonical URL, and product asset requirements.
10. Accessibility acceptance and concrete verification.

Use `none` when a field is intentionally absent. Do not omit a security or cache field because the route is currently simple.

## Current inventory

### `/`

- **Entry:** [`src/app/page.tsx`](../../src/app/page.tsx), composed by `src/app/layout.tsx`.
- **Class:** public; no identity or protected resource is required.
- **Purpose:** neutral starter landing page and theme-control demonstration.
- **Inputs:** no route parameters, search parameters, request headers, or body data.
- **Rendering and cache:** static server-rendered shell with no request-specific data. The theme control is a contained Client Component and persists only an explicit browser preference.
- **Data dependencies:** none.
- **Mutations and handlers:** no server mutation or Route Handler. Theme preference is local presentation state, not server data.
- **Security:** no authorization gate. The page must not expose environment values or privileged modules to the client.
- **States:** the root App Router error and not-found conventions apply; no route-specific asynchronous loading state is required while the page has no server read.
- **Metadata:** root metadata remains neutral until downstream adoption. Add icons or a manifest only with real product assets and an intentional installable-app decision.
- **Accessibility:** one descriptive page heading; the theme control remains a native keyboard/touch-operable button with visible focus, a stable accessible name, and exposed state.
- **Verification:** `GET /` returns success in `pnpm dev` and after a successful `pnpm build` with `pnpm build:start`; the page has no hydration or runtime console error and the theme control works from keyboard and pointer input.

## Maintenance

Update a record when its URL, class, enforcement point, data, mutation, cache behavior, state handling, metadata, or accessibility contract changes. Remove records with deleted routes. Re-run `pnpm typegen` after route-shape changes and `pnpm verify` before handoff.
