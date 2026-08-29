# Template Baseline Diagnostic

## Summary

Status: `resolved`. On 2026-08-28, the template's moving runtime and framework targets were resolved once and frozen for implementation. This record exists so the selection can be audited without turning ordinary guidance into a second version source.

## Affected baseline

- Node.js: `26.8.1` (Current)
- pnpm: `11.24.0`
- Next.js: `16.3.3`
- React and React DOM: `19.2.8`
- Native application TypeScript: `7.0.2`
- JavaScript tooling compatibility API: `@typescript/typescript6@6.0.2`

The executable source of truth remains [`package.json`](../../../../package.json), [`pnpm-workspace.yaml`](../../../../pnpm-workspace.yaml), [`pnpm-lock.yaml`](../../../../pnpm-lock.yaml), and [`next.config.ts`](../../../../next.config.ts).

## Evidence and decisions

Registry `latest` metadata and the official Node.js Current release were checked on 2026-08-28. The selected Next.js package's optional dependencies were used to derive the complete `@next/swc-*` release-age exception set. Newly published exact dependencies required by the frozen baseline are explicitly exempted from the workspace release-age delay.

The framework target enables Cache Components, typed routes, the framework agent-rules integration, standalone output, and the native Turbopack React Compiler path while keeping TypeScript build errors blocking. TypeScript 7 remains the application compiler; the isolated TypeScript 6 package exists only because TypeScript 7 does not expose the stable JavaScript compiler API required by the repository formatters.

CI uses pinned `pnpm/setup` and `actions/checkout` commits. `pnpm/setup` reads the package manager and runtime versions from `package.json`, caches the pnpm store, skips its automatic install, and leaves `pnpm install --frozen-lockfile` as an explicit workflow step.

## Regression protection

`pnpm lint:baseline` compares the manifest, workspace exceptions, installed metadata, and lockfile. `pnpm verify` adds formatter/layout checks, native type generation and typechecking, focused tooling tests, guidance validation, and a production build.

Re-open this record only when changing the frozen release set or framework configuration. Create a new dated diagnostic for a later baseline instead of rewriting the historical evidence here.
