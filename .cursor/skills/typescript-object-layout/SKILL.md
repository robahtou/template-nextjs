---
name: typescript-object-layout
description: Uses the repository object formatter for TypeScript and JavaScript. Apply when object literals, destructuring, type members, or configuration shapes fail layout checks.
---
# TypeScript Object Layout

- Let `tooling/code-style/typescript-object-layout.mjs` define whitespace and line breaks.
- Design clear object boundaries and names before formatting.
- Keep related simple shapes compact and avoid manual column alignment.
- Check with `pnpm lint:objects`.
- Fix with `pnpm fmt:objects`, inspect the diff, and rerun the check.

Do not add Prettier or reproduce formatter internals in prose. Change behavior only with focused fixtures that cover check and fix modes.
