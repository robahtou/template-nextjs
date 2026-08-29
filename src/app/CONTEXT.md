# App Router Context

## Ownership

`src/app` owns URL structure and Next.js App Router entry points: layouts, pages, metadata, loading/error/not-found UI, Route Handlers, and route-scoped composition. It does not own reusable services or cross-route UI.

Use the project [Next.js conventions](../../docs/nextjs/CONTEXT.md) for current syntax and the [route inventory](../../docs/routes/CONTEXT.md) for access, cache, and acceptance records.

## Current root

- `layout.tsx` owns the document shell, neutral root metadata, theme bootstrap, and the single global style import.
- `page.tsx` owns `/`.
- `styles.module.css` owns styles used by the root page.
- [`_components`](./_components/CONTEXT.md) is private implementation space for the surrounding route tree.

## Route structure

- Keep special files at the segment they govern.
- Put route-private UI in `<segment>/_components`; underscore-prefixed folders do not add a URL segment.
- Move UI to [`src/components`](../components/CONTEXT.md) only after multiple routes share its contract.
- Move cohesive multi-route domain code to `src/features/<domain>` only when a downstream feature is large enough to justify that real boundary.
- Update the route inventory in the same change that adds, removes, or reclassifies a route.

## Rendering boundary

Pages and layouts are Server Components by default. Perform initial reads and privileged composition on the server. Add `'use client'` to the smallest leaf that needs browser APIs, event handlers, effects, local state, or client-only context; pass it minimal serializable props.

Await asynchronous `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` where used. Keep uncached request-time work behind a meaningful Suspense boundary when Cache Components is enabled.

## Mutations and HTTP

Use a Server Action for a mutation initiated by this application's UI. Validate the input, authenticate and authorize the caller, call a server-owned operation, invalidate only affected cache entries, and return a safe serializable result.

Use `route.ts` for genuine HTTP contracts such as webhooks, machine clients, streaming, files, or custom methods. Route code should call [`src/lib`](../lib/CONTEXT.md) directly rather than making internal HTTP requests back into the same application.

## Metadata, fonts, and assets

Keep starter metadata neutral until adoption. The template uses system-font stacks from the [global style system](../assets/styles/CONTEXT.md) and does not claim unshipped local fonts. Do not add manual placeholder favicon or manifest links. Add real icons, social images, and a manifest through current Next.js file-based metadata conventions only when product assets and installable-app behavior are defined.

Route-owned component styles use colocated `styles.module.css`; app-wide tokens and global element behavior stay under `src/assets/styles`.

## Security and accessibility

- Enforce authenticated and resource-specific access on the server before protected reads or mutations.
- Do not treat Proxy, redirects, hidden controls, or Client Component state as authorization.
- Keep secrets and privileged modules out of client dependency graphs, HTML, cache keys, and user-facing errors.
- Provide semantic loading, empty, denied, not-found, error, and success states.
- Preserve keyboard and touch parity, visible focus, useful accessible names, and correct focus behavior across navigation and dialogs.

## Maintenance

Update this context when App Router ownership, root shell behavior, route-private placement, metadata policy, or server/client boundaries change. Update the [architecture context](../../docs/architecture/CONTEXT.md) for cross-cutting boundary changes and run `pnpm typegen` plus `pnpm verify` after route-shape changes.
