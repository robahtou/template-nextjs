---
name: typescript-parameter-layout
description: Formats and aligns supported parameters in multiline TypeScript and JavaScript declaration signatures. Use when editing functions, callbacks, methods, constructors, accessors, or function-like type signatures.
---

# TypeScript Parameter Layout

Treat `tooling/code-style/typescript-parameter-layout.mjs` as authoritative.

## Scope

- Format declaration parameter lists only when the parentheses already span multiple lines.
- Preserve parameter order, blank-line groups, optional markers, rest markers, modifiers, defaults, and types.
- Align supported typed identifier parameters across the complete signature.
- Keep destructured parameters, decorators, multiline types, and multiline initializers as raw entries while normalizing their list placement.
- Leave call arguments and single-line declarations unchanged.
- Leave a signature unchanged when comments occur in its comma gaps.

## Alignment

- One or two supported parameters align to the longest rendered key.
- Three or more use the formatter's odd/even padding rule.
- Nonfinal parameters receive commas; the final parameter does not.

## Commands

- Run `pnpm lint:parameters` to check the owning project.
- Run `pnpm fmt:parameters` to fix the owning project.
- Run `pnpm fmt:file --file <path>` when the import, object, parameter, and const stages should converge together.

Do not hand-maintain alignment or add a competing formatter. Extend behavior through focused fixtures and the repository script.
