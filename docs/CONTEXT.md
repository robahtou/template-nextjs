# Documentation Context

## Purpose

`docs` records durable project decisions that span source folders. Start with the root [README](../README.md); use the nearest source `CONTEXT.md` for folder-local ownership.

## Canonical guides

- [Adoption](adoption/CONTEXT.md) owns downstream setup and removal of starter identity.
- [Architecture](architecture/CONTEXT.md) owns source placement and application boundaries.
- [Next.js](nextjs/CONTEXT.md) owns framework conventions and feature-dependent behavior.
- [Diagnostics](nextjs/diagnostics/CONTEXT.md) owns reproducible Next.js investigation records.
- [Lessons](nextjs/lessons/CONTEXT.md) owns durable, verified conclusions from framework work.
- [Routes](routes/CONTEXT.md) owns route classification and the route inventory.

Folder-specific contracts live with their source:

- [App Router](../src/app/CONTEXT.md)
- [Route-private components](../src/app/_components/CONTEXT.md)
- [Imported assets](../src/assets/CONTEXT.md)
- [Global styles](../src/assets/styles/CONTEXT.md)
- [Shared components](../src/components/CONTEXT.md)
- [Application libraries](../src/lib/CONTEXT.md)
- [Pure utilities](../src/utils/CONTEXT.md)

## Ownership rules

1. Keep one canonical owner for each fact and link to it elsewhere.
2. Keep exact runtime and dependency versions in `package.json`; keep enabled framework features in `next.config.ts`.
3. Name nested project and folder guides `CONTEXT.md`. A specialized topic gets a folder containing `CONTEXT.md`.
4. Record current contracts, evidence, and decisions rather than aspirations, copied framework documentation, or empty templates.
5. Do not place secrets, private customer data, access tokens, raw cookies, or unredacted request headers in documentation.

## Maintenance

Update the owning guide when a change alters responsibilities, route access, data flow, cache behavior, security boundaries, accessibility acceptance, or extension points. Update all affected local links when files move. Do not churn guidance for formatting, wording-only source edits, or implementation details that leave the contract unchanged.

Before handoff, run `pnpm lint:guidance` for paths, links, command references, and naming, then run `pnpm verify`.
