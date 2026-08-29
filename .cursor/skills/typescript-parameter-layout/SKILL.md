---
name: typescript-parameter-layout
description: Uses the repository parameter formatter for TypeScript and JavaScript. Apply when function declarations, callbacks, React props, or signatures fail layout checks.
---

# TypeScript Parameter Layout

- Let `tooling/code-style/typescript-parameter-layout.mjs` define spacing and line breaks.
- Prefer a named options object when positional or boolean parameters hide meaning.
- Keep public boundary types explicit and preserve behavior while formatting.
- Check with `pnpm lint:parameters`.
- Fix with `pnpm fmt:parameters`, inspect the diff, and rerun the check.

Do not hand-align parameters or add a competing formatter. Change the contract through focused check/fix fixtures.
