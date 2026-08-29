# Template Adoption Context

## Goal

Turn the starter into one product-owned application without retaining template identity or hypothetical compatibility. This is a greenfield baseline: there are no users or production data to migrate, so replace obsolete definitions directly and remove unused starter behavior instead of adding aliases, wrappers, migration files, or version-suffixed alternatives.

Return to the root [adopter entry point](../../README.md) for commands and the complete guidance map.

## Adoption sequence

1. **Runtime:** install with the exact Node.js and pnpm versions declared by `package.json`. If automatic runtime download is disabled, configure a version manager from the same fields.
2. **Identity:** change the package name, application metadata, visible starter copy, canonical URL assumptions, and the theme storage key. Search for the old values before handoff.
3. **Routes:** add each URL to the [route inventory](../routes/CONTEXT.md), choose its access class, and define server-side enforcement before building navigation.
4. **Environment:** document each required variable by name, purpose, owner, availability, and validation point. Commit examples without values; keep secrets in the deployment environment and read them only in server-owned modules.
5. **Assets and metadata:** use the system-font baseline until real, licensed fonts are selected. Add icons, a manifest, social images, and other Next.js file-based metadata only when final product assets exist. Do not preserve placeholder PWA files or links.
6. **Architecture:** follow the [source boundaries](../architecture/CONTEXT.md). Introduce optional folders or dependencies only for implemented requirements.
7. **Product choices:** explicitly select authentication, authorization, persistence, internationalization, client state, UI libraries, observability, email, testing, and deployment. None is implied by this template.
8. **Legal and operations:** review `LICENSE`, third-party asset licenses, telemetry policy, retention requirements, supported browsers, deployment regions, and incident ownership.
9. **Verification:** run `pnpm verify`, inspect a successful standalone build with `pnpm build:start`, and exercise each route class with allowed and denied states.

## Asset policy

Imported build assets belong under [`src/assets`](../../src/assets/CONTEXT.md); URL-addressable product files belong under `public/` or the appropriate App Router metadata convention. Adding a manifest implies an intentional installable-web-app decision, valid icons, product names, start URL, display mode, colors, and a tested update strategy.

Local fonts require the font binaries, a compatible license, declared weights and styles, deliberate preload behavior, and a fallback stack. Otherwise keep the zero-download system stacks defined by the [style system](../../src/assets/styles/CONTEXT.md).

## Security handoff

- Treat browser input, form data, route parameters, headers, cookies, webhooks, and third-party responses as untrusted.
- Validate at the server boundary and authorize every protected read and mutation there.
- Keep secrets and privileged SDKs out of Client Component dependency graphs.
- Return safe errors to users and send sensitive detail only to an approved server-side diagnostic sink.
- Use Proxy only for optimistic routing or request shaping, never as the sole authorization layer.

## Completion criteria

Adoption is complete when no starter identity remains, every route is classified, optional systems are deliberate and documented, real assets replace any product metadata claims, required environments can be reproduced without shared secrets, and both development and production behavior pass the repository verification contract.

If adoption changes Next.js feature assumptions, update the [Next.js context](../nextjs/CONTEXT.md). If it changes a durable folder boundary, update the nearest source `CONTEXT.md`.
