# Audit Dynamic APIs

Audit the scope in `$ARGUMENTS` for current Next.js request API usage.

1. Confirm the pinned Next.js version and inspect `next.config.ts`.
2. Find reads of `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()`.
3. Await request-bound values before property access and propagate `async` only as far as required.
4. Keep Server Components server-side; do not add a Client Component merely to unwrap request data.
5. Remove obsolete compatibility forms instead of retaining parallel APIs.
6. Review caching implications when request data makes output request-specific.
7. Run `pnpm typecheck` and `pnpm build`.

Report changed call sites, cache behavior, and validation results.
