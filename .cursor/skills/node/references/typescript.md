---
name: typescript
description: TypeScript boundaries between Next.js application code and native Node tooling
metadata:
  tags: typescript, nextjs, type-stripping, tooling, boundaries
---

# TypeScript in Node.js

## Preserve the repository's two execution lanes

The root application uses the pinned `typescript` package, Next.js compilation, and `moduleResolution: "bundler"`. Directly executed repository scripts use the pinned Node runtime and `.mjs`.

- Keep application `.ts` and `.tsx` under the Next.js and root `tsconfig.json` contract.
- Keep `scripts` and `tooling` entry points as `.mjs` unless a separate change updates their commands, lint coverage, and tests.
- Do not apply native Node extension rules to Next.js application imports.
- Do not import Node built-ins from a Client Component or any module reachable by one.

Use type-only imports when a binding has no runtime role:

```typescript
import type { Metadata } from 'next';

import { createRecord } from '@Lib/create-record';
import type { RecordInput } from '@Lib/create-record';
```

## Typecheck explicitly

Node's TypeScript type stripping does not typecheck. The project command is the authority:

```bash
pnpm typecheck
```

It generates Next.js framework declarations and runs the root TypeScript compiler without emitting application JavaScript. Use `pnpm verify` for the complete repository gate.

## Native TypeScript is an exception here

The pinned Node runtime can execute erasable TypeScript syntax directly, but that capability is not the repository-tooling convention. If a standalone Node `.ts` entry point is intentionally introduced, keep it within native type-stripping constraints:

- Mark type-only imports with `import type`.
- Use explicit `.ts` extensions for relative imports in that native entry-point graph.
- Avoid enums, namespaces, constructor parameter properties, and other syntax that requires transformation.
- Run `pnpm typecheck` separately and add direct execution tests.

Do not convert Next.js source imports to `.ts` extensions or execute application `.tsx` files with raw Node.

## Compiler API boundary

The root `typescript` dependency is the native application compiler. Repository-owned AST formatters use the isolated `@typescript/typescript6` compatibility API in `tooling/code-style` because the root compiler does not expose the stable JavaScript API those tools require.

Do not import the root `typescript` package from formatter scripts, alias the application compiler to the compatibility package, or broaden that package beyond the private tooling workspace. Updating either compiler is a coordinated manifest, lockfile, formatter-fixture, typecheck, and build change.
