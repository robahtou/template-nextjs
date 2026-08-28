# Repository Code Style Context

## Ownership

This workspace owns the generic EOP-compatible file-formatting and syntax-policy tools used by the template. The formatter contract is `eop-aligned-v1`: a supported file formatted in another project with the same contract must produce the same bytes here.

The scripts use Node.js built-ins plus the isolated `@typescript/typescript6` compatibility API. Application typechecking remains owned by the native root TypeScript dependency.

## Canonical formatting

- `typescript-import-layout.mjs` orders type and runtime imports, splits mixed type/value imports, preserves intentional subgroups, aligns `from` clauses with a column cap, formats named re-exports, and normalizes module-header and bottom-export spacing.
- `typescript-object-layout.mjs` formats multiline object literals and type literals, expands shorthand properties, aligns participating `:` members across the whole block, and preserves blank groups, supported comments, methods, spreads, and computed members.
- `typescript-parameter-layout.mjs` formats multiline declaration parameter lists and aligns supported typed identifiers while preserving unsupported or comment-sensitive entries.
- `typescript-const-layout.mjs` aligns consecutive single-declarator `const` statements and compatible type-alias groups without reordering declarations.
- `css-formatting.mjs` renders supported CSS blocks deterministically, including indentation, declaration alignment, semicolons, selector spacing, and normalized hexadecimal casing.
- `no-class-syntax.mjs` rejects project-authored class declarations and class expressions.
- `fmt-file.mjs` applies imports, objects, parameters, and consts to supported JavaScript or TypeScript targets, and applies the CSS formatter to CSS targets. It accepts `--file <path>`, a positional target, or a directory.

Every fixing formatter is idempotent. Check mode reports files whose canonical rendering differs; fix mode writes only those files. Formatter order is imports, objects, parameters, then consts.

## Portable command contract

Formatter defaults are relative to the invoking project: `src/` plus an optional root `next.config.ts`; CSS defaults to `src/`. Explicit file or directory targets override those defaults. The generic source extensions are `.ts`, `.tsx`, `.js`, `.jsx`, and `.mjs`.

The tools intentionally contain no template application imports, aliases, or runtime assumptions. Project packages expose the same thin command aliases:

- `pnpm lint:imports`, `pnpm lint:objects`, `pnpm lint:parameters`, `pnpm lint:consts`, and `pnpm lint:css`
- `pnpm fmt:imports`, `pnpm fmt:objects`, `pnpm fmt:parameters`, `pnpm fmt:consts`, and `pnpm fmt:css`
- `pnpm fmt:file --file <path>`

Repository-specific prose formatting remains separate from this cross-project file-formatting contract.

## TypeScript bridge

TypeScript 7 is the application compiler. The exact TypeScript 6 package is a temporary compiler-API bridge private to `tooling/code-style`; it must not be aliased into the application. Remove it when a stable TypeScript 7 JavaScript API is available.

## Verification

Run `pnpm test:code-style` for formatter fixtures, `pnpm lint:tooling` for the tool sources, and the repository's non-fixing validation before handoff. The composite `fmt-file` fixture asserts exact TypeScript and CSS output plus second-pass idempotence.
