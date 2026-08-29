# Repository Code Style Context

## Ownership

This workspace owns the template's file-formatting and syntax-policy tools. The formatter contract is `template-code-style-v1`: a supported file formatted in another project with the same contract must produce the same bytes here.

The scripts use Node.js built-ins plus the isolated `@typescript/typescript6` compatibility API. Application typechecking remains owned by the native root TypeScript dependency.

## Canonical formatting

- `typescript-import-layout.mjs` orders type and runtime imports, splits mixed type/value imports, preserves intentional subgroups, aligns `from` clauses with a column cap, formats named re-exports, and normalizes module-header and bottom-export spacing.
- `typescript-object-layout.mjs` formats multiline object literals and type literals, expands shorthand properties, aligns participating `:` members across the whole block, and preserves blank groups, supported comments, methods, spreads, and computed members.
- `typescript-parameter-layout.mjs` formats multiline declaration parameter lists and aligns supported typed identifiers while preserving unsupported or comment-sensitive entries.
- `typescript-const-layout.mjs` aligns consecutive single-declarator `const` statements and compatible type-alias groups without reordering declarations.
- `css-formatting.mjs` renders supported CSS blocks deterministically, including indentation, declaration alignment, semicolons, selector spacing, and normalized hexadecimal casing.
- `no-class-syntax.mjs` rejects project-authored class declarations and class expressions.
- `code-style.mjs` is the repository-wide check/fix entrypoint. It discovers files once, reads each source once, applies the complete in-process pipeline, and writes changed files once.
- `fmt-file.mjs` applies that in-process TypeScript or CSS pipeline to one source file and the prose formatter to one `CONTEXT.md`. It accepts `--file <path>` or a positional target, rejects paths outside the repository, and no-ops for missing or unsupported files.

Every fixing formatter is idempotent. Check mode reports files whose canonical rendering differs; fix mode writes only those files. TypeScript formatter order is imports, objects, parameters, then consts. The pipeline reuses one parentless TypeScript syntax tree while text remains unchanged and reparses only after a rewrite.

## Portable command contract

Root formatter defaults cover `src`, `scripts`, and `tooling` plus optional root `next.config.ts` and `postcss.config.js`; CSS defaults to `src`. Explicit file or directory targets override those defaults. The generic source extensions are `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`.

File discovery is shared, bounded, deterministic, and physical-path aware so overlapping or symbolic-link targets are not rescanned. Generated, dependency, cache, planning, and formatter-fixture directories are excluded centrally.

The tools intentionally contain no template application imports, aliases, or runtime assumptions. `pnpm lint` and `pnpm fmt` each invoke the composite source pipeline once, then run repository-wide context prose separately. Focused aliases remain available:

- `pnpm lint:imports`, `pnpm lint:objects`, `pnpm lint:parameters`, `pnpm lint:consts`, and `pnpm lint:css`
- `pnpm fmt:imports`, `pnpm fmt:objects`, `pnpm fmt:parameters`, `pnpm fmt:consts`, and `pnpm fmt:css`
- `pnpm fmt:file --file <path>`

Repository-wide prose formatting remains a separate command, while `fmt:file` can apply that same formatter to one `CONTEXT.md`.

## TypeScript bridge

TypeScript 7 is the application compiler. The exact TypeScript 6 package is a temporary compiler-API bridge private to `tooling/code-style`; it must not be aliased into the application. Remove it when a stable TypeScript 7 JavaScript API is available.

## Verification

Run `pnpm test:code-style` for formatter fixtures, `pnpm lint:tooling` for the tool sources, and the repository's non-fixing validation before handoff. The composite `fmt-file` fixtures assert exact TypeScript, CSS, and context-prose output, second-pass idempotence, extension coverage, spaces in paths, missing and unsupported no-ops, and repository-containment enforcement.
