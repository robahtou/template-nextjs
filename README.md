# Next.js Application Template

This repository is a greenfield Next.js App Router starter with TypeScript, pnpm, CSS Modules, Cache Components, Turbopack, and React Compiler. It has no production users, production data, or compatibility contract, so adopters should replace starter decisions directly instead of preserving obsolete behavior with shims or migrations.

## Runtime source of truth

`package.json` declares the exact Node.js, pnpm, Next.js, React, and TypeScript versions. Use those values when configuring a version manager or CI; do not copy patch versions into documentation. `next.config.ts` is authoritative for enabled framework features.

## Start here

```bash
pnpm install
pnpm dev
```

Before handing work off, run:

```bash
pnpm verify
```

## Adopt the template

1. Rename the package and replace starter metadata, visible copy, and the theme storage key with product-owned values.
2. Classify every route in the [route inventory](docs/routes/CONTEXT.md), then define its server data, mutation, authorization, loading, error, metadata, and accessibility behavior.
3. Add only required environment variables. Commit variable names and setup guidance in an example file, never credentials or production values.
4. Keep the system-font baseline unless licensed font files are deliberately added. Do not ship placeholder icons, favicons, or a web manifest; add Next.js file-based metadata and real product assets together when the product needs PWA behavior.
5. Select authentication, data storage, state, internationalization, observability, testing, deployment, and UI libraries only when requirements justify them. Update the nearest context when a choice changes an ownership or security boundary.
6. Review `LICENSE`, deployment settings, telemetry policy, browser support, and legal requirements for the adopted product.
7. Run `pnpm verify`, then exercise public and protected behavior in development and in a production build.

See the [adoption guide](docs/adoption/CONTEXT.md) for the complete handoff checklist.

## Commands

- `pnpm dev` starts the development server.
- `pnpm build` creates a portable production build.
- `pnpm start` serves an existing production build.
- `pnpm typegen` generates Next.js route and framework declarations.
- `pnpm typecheck` generates framework declarations, then runs the non-incremental application typecheck.
- `pnpm lint` checks repository policy, layout, formatting, CSS, and context prose. It is not a claim of ESLint-equivalent semantic coverage.
- `pnpm fmt` fixes supported repository formatting and context prose.
- `pnpm fmt:file --file <path>` applies the generic EOP-compatible formatter pipeline to one supported file.
- `pnpm test:tooling` runs the focused code-style and guidance tooling tests.
- `pnpm verify:core` checks the dependency baseline, lint, types, tooling tests, and production build.
- `pnpm verify` runs the complete non-fixing validation, including canonical-guidance checks and the production build.

## Source map

- [`src/app`](src/app/CONTEXT.md) owns App Router entries, layouts, metadata, route handlers, and URL behavior.
- [`src/app/_components`](src/app/_components/CONTEXT.md) owns UI private to the surrounding route tree.
- [`src/components`](src/components/CONTEXT.md) owns UI genuinely shared by multiple routes.
- [`src/lib`](src/lib/CONTEXT.md) owns application services, integrations, and cohesive application policy.
- [`src/utils`](src/utils/CONTEXT.md) owns small, pure, platform-neutral helpers.
- [`src/assets`](src/assets/CONTEXT.md) owns build-imported static resources, including the [`src/assets/styles`](src/assets/styles/CONTEXT.md) global style system.

Route-specific implementation stays close to its route. A downstream project may introduce `src/features/<domain>` only when a real domain has enough UI and logic to need that boundary; do not create empty architecture.

## Guidance map

- [Documentation ownership](docs/CONTEXT.md)
- [Template adoption](docs/adoption/CONTEXT.md)
- [Application architecture](docs/architecture/CONTEXT.md)
- [Modern Next.js conventions](docs/nextjs/CONTEXT.md)
- [Next.js diagnostics records](docs/nextjs/diagnostics/CONTEXT.md)
- [Verified Next.js lessons](docs/nextjs/lessons/CONTEXT.md)
- [Route classification and inventory](docs/routes/CONTEXT.md)
- [App Router source](src/app/CONTEXT.md)
- [Route-private components](src/app/_components/CONTEXT.md)
- [Imported assets](src/assets/CONTEXT.md)
- [Global style system](src/assets/styles/CONTEXT.md)
- [Shared components](src/components/CONTEXT.md)
- [Application libraries](src/lib/CONTEXT.md)
- [Pure utilities](src/utils/CONTEXT.md)
- [Repository policy checkers](scripts/lint/CONTEXT.md)
- [Code-style tooling](tooling/code-style/CONTEXT.md)

## Maintenance

`README.md` is the adopter entry point. The nearest `CONTEXT.md` owns durable folder responsibilities, invariants, related paths, and safe extension points. Update guidance only when ownership, routing, data flow, cache behavior, security posture, or extension points materially change; formatting-only edits do not require documentation churn.

Manifests and configuration remain authoritative for versions and feature flags. Link to those sources instead of duplicating moving facts. Every nested project or folder guide is named `CONTEXT.md`.
