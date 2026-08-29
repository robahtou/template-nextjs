---
name: typescript-import-layout
description: Uses the repository import formatter for TypeScript and JavaScript. Apply when imports are added, reordered, checked, or producing layout failures.
---
# TypeScript Import Layout

- Let `tooling/code-style/typescript-import-layout.mjs` define the layout.
- Use `import type` for type-only dependencies and remove unused or duplicate bindings.
- Keep side-effect imports intentional; do not reorder them by guesswork.
- Check with `pnpm lint:imports`.
- Fix with `pnpm fmt:imports`, inspect semantic changes, and rerun the check.

Do not add a competing formatter or encode the formatter's implementation details in another guide. Add focused fixtures when changing the contract.
