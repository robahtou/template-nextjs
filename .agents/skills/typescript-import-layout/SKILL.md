---
name: typescript-import-layout
description: Formats TypeScript and JavaScript module headers, named re-export blocks, and footers for this repository. Enforces `import type` before regular `import`, forbids inline `type` specifiers inside mixed imports, applies repo-specific blank-line rules between import groups, aligns `from` clauses with a maximum start column of 57 for imports and named re-exports, and keeps two blank lines after the import block and before `export default`. Use when editing or reviewing TS/JS module formatting in this project.
---

# TypeScript Import Layout

## When to use

Use this skill when you need to:
- Format or reformat the top of a `.ts`, `.tsx`, `.js`, `.jsx`, or `.mjs` module in this repository
- Normalize `import type` / `import` ordering and spacing
- Split mixed imports that use inline `type` specifiers
- Align `from` clauses in import blocks and named re-export blocks
- Normalize spacing before `export default`

## Scope

This skill is about layout and formatting only.
- Preserve semantics.
- Preserve the existing order within the `import type` group and within the regular `import` group unless the user asks for reordering.
- Preserve intentional blank-line subgrouping within the `import type` group and within the regular `import` group.
- Preserve the existing order within named re-export blocks unless the user asks for reordering.
- Do not alphabetize imports unless the user explicitly asks.
- Do not alphabetize re-exports unless the user explicitly asks.

## Rules

### 1. Import order

1. Put all `import type` statements first.
2. Put all regular `import` statements after the `import type` group.
3. If the file has only one kind of import, keep that single group contiguous.

### 1a. `server-only` sentinel import

If `import 'server-only';` is present:
- keep it at the very top of the import block
- keep it above all `import type` statements
- leave exactly one blank line after it when other imports follow

Example:

```ts
import 'server-only';

import type { Pool }                          from 'pg';
import type { SupportedAuthOrganizationRole } from './controlPlaneAccess';

import { authDatabaseReady }                  from '@Auth/server/db/health';
import { authDatabasePool }                   from '@Auth/server/db/pool';
```

### 1b. No inline `type` in mixed imports

Do not keep `type` inline inside a regular `import` statement.

Before:

```ts
import {
  executeTabUserQuery,
  type TabRowsetExecutionState
} from '#Pipelines/lib/tabExecutionCore/executeTabUserQuery';
```

After:

```ts
import type { TabRowsetExecutionState }             from '#Pipelines/lib/tabExecutionCore/executeTabUserQuery';
import { executeTabUserQuery }                      from '#Pipelines/lib/tabExecutionCore/executeTabUserQuery';
```

Rules:
- If an import mixes runtime bindings and type-only bindings, split it into separate import statements.
- Put the type-only bindings into a standalone `import type` statement.
- Put the runtime bindings into a standalone regular `import` statement.
- After splitting, apply the normal type-group / regular-group spacing rules.

### 2. Blank line between `import type` and `import`

Default rule:
- If both an `import type` group and a regular `import` group are present, insert exactly one blank line between them, unless one of the exceptions below applies.

Exceptions:
- If there are exactly 2 total imports, with 1 `import type` and 1 regular `import`, do not insert a blank line between them.
- If there are exactly 3 total imports, with 2 `import type` and 1 regular `import`, do not insert a blank line between them.
- If there are exactly 3 total imports, with 1 `import type` and 2 regular `import`, do not insert a blank line between them.

Equivalent shorthand:
- Only add the separator blank line when both groups exist and the total import count is 4 or more.

### 2a. Preserve internal subgroup separators

- If existing imports inside the same `import type` group or regular `import` group are separated by a blank line, keep a single blank line between those subgroups.
- Do not invent new subgroups automatically; preserve intentional separators already present in the source.

### 3. Blank lines after the import block

After the last import, leave exactly two blank lines before the next statement or declaration.

### 4. `export default` placement and spacing

If a file has bottom exports:
- Keep the exports at the bottom of the file.
- Treat adjacent bottom export statements as one export group.
- Leave exactly two blank lines before the export group.
- Leave no blank lines between export statements inside that bottom export group.

If a file has an `export default`:
- Place `export default` at the bottom of that export group.

Example bottom export group:

```ts
export { schema };
export default _get;
```

## `from` alignment

### 5. Alignment goal

Align all `from` clauses in the import block or named re-export block to the same column.

Project rule:
- The `from` keyword must start no later than column `57`.

Project tab rule:
- A "tab" is 2 spaces.
- In practice, this means `from` lands on the next odd-numbered column after the chosen anchor.

### 6. How to choose the alignment column

Treat columns as 1-based monospace columns.

1. Ignore current padding and normalize each import to its preferred inline form before measuring it.
2. If a multiline import fits inline without pushing `from` past column `57`, collapse it back to a single line before measuring.
3. For each named import, record the column where the closing `}` ends in that normalized inline form.
4. If an import cannot fit inline within the cap and must wrap, its candidate column comes from its longest stacked specifier line instead (see rule 7).
5. Choose the largest candidate column that still allows `from` to begin at or before column `57`.
6. Convert a closing-`}` column into the shared `from` column using this rule:
   - if `}` ends on an even column, add 1 space
   - if `}` ends on an odd column, add 2 spaces
7. Pad all imports so `from` begins on that shared column.

Equivalent alignment rule:
- `from` should start on the next odd-numbered column after the chosen anchor, capped at column `57`.

### 7. Long import exception

Do not let one oversized import force the whole block past the cap.

Do not keep a short multiline import just because it is already written that way. If it fits inline within the cap, collapse it first and let it participate in choosing the shared alignment column.

If an import would force `from` past column `57`:
1. Rewrite that import as a multiline named import.
2. Measure its stacked specifier lines as rendered: 2-space indent, one specifier per line, trailing comma on every line except the last. Take the longest of those lines, comma included.
3. Derive that import's alignment candidate from the longest stacked line with the usual parity rule: if the cursor column right after the line is odd, `from` starts two spaces later; if it is even, one space later. Equivalently, `from` starts on the next odd column after the longest stacked line.
4. Let that stacked-line candidate participate in choosing the shared alignment column alongside the inline candidates, still capped at column `57`.
5. Align the `from` on the closing-brace line with the shared column chosen for the block.

Example measurement: with stacked lines `  ProblemDetailsSchema,`, `  TabExecutionHistoryResponseSchema,`, and `  TabExecutionParamsSchema`, the longest line is `  TabExecutionHistoryResponseSchema,` at 36 characters, the cursor after it sits on odd column 37, so `from` starts two spaces later on column 39.

If every candidate would exceed the cap:
1. Rewrite the longest named import or imports as multiline imports first.
2. Recompute the shared alignment column from the remaining inline candidates and the stacked-line candidates.
3. Keep `from` at or before column `57`.

### 8. Multiline import form

When a named import must wrap, use this shape:

```ts
import {
  ProblemDetailsSchema,
  TabExecutionHistoryResponseSchema,
  TabExecutionParamsSchema
}                                     from '@queryai-postgres/resource-api-contracts/tab-executions';
```

Rules:
- Keep `import {` on its own line.
- Put one imported symbol per line.
- Put the closing `}` on its own line.
- Align the `from` after the closing `}` using the same shared column as the rest of the import block.
- When the wrapped import's stacked-line candidate is the widest in the block (for example when it is the only import), `from` lands one or two spaces after the end of the longest stacked specifier line, on the next odd column.

## Named re-export alignment

Apply the same `from` alignment rule to named re-export blocks:
- `export { ... } from '...'`
- `export type { ... } from '...'`

Scope:
- Preserve the existing order within the block.
- Align all `from` clauses in that contiguous named re-export block to the same column.
- Use the same maximum `from` column of `57`.
- Exclude `export * from '...'` and `export * as foo from '...'` from this rule.

If a named re-export exceeds the cap:
- Rewrite the export as a multiline named re-export.
- Measure its stacked specifier lines the same way as a wrapped import (rule 7) and let the resulting parity-based column participate in the block's shared `from` column.
- Align the `from` on the closing-brace line with the shared column.

Multiline named re-export form:

```ts
export {
  ProblemDetailsSchema,
  TabExecutionHistoryResponseSchema,
  TabExecutionParamsSchema
}                                     from '@queryai-postgres/resource-api-contracts/tab-executions';
```

## Examples

### Standard mixed block with separator

Before:

```ts
import type { Sql } from 'postgres';
import type { Tenancy } from '#Auth/types';
import type { UUIDv7 } from '#Types/primitives/ids';
import type { TabExecutionMode, TabExecutionRecord } from '#Types/db/tabExecutions';
import { createLogger, safeErrorForLog } from '#Logging/index';
```

After:

```ts
import type { Sql }                                   from 'postgres';
import type { Tenancy }                               from '#Auth/types';
import type { UUIDv7 }                                from '#Types/primitives/ids';
import type { TabExecutionMode, TabExecutionRecord }  from '#Types/db/tabExecutions';

import { createLogger, safeErrorForLog }              from '#Logging/index';
```

### Exception: 2 total imports

Before:

```ts
import type { Sql } from 'postgres';
import { createLogger } from '#Logging/index';
```

After:

```ts
import type { Sql }     from 'postgres';
import { createLogger } from '#Logging/index';
```

### Exception: 3 total imports with 2 type imports

Before:

```ts
import type { Sql } from 'postgres';
import type { Tenancy } from '#Auth/types';
import { createLogger } from '#Logging/index';
```

After:

```ts
import type { Sql }     from 'postgres';
import type { Tenancy } from '#Auth/types';
import { createLogger } from '#Logging/index';
```

### Exception: 3 total imports with 2 regular imports

Before:

```ts
import type { Sql } from 'postgres';
import { performance } from 'node:perf_hooks';
import { createLogger } from '#Logging/index';
```

After:

```ts
import type { Sql }     from 'postgres';
import { performance }  from 'node:perf_hooks';
import { createLogger } from '#Logging/index';
```

### Long import that must wrap

Before:

```ts
import type { Sql } from 'postgres';
import type { Tenancy } from '#Auth/types';
import type { TabExecutionMode, TabExecutionRecord } from '#Types/db/tabExecutions';
import { buildRowsetTruncation, mapDispatchedExecutionError, orchestratePreparedExecution } from '#Pipelines/lib/executionCore/index';
```

After:

```ts
import type { Sql }                                   from 'postgres';
import type { Tenancy }                               from '#Auth/types';
import type { TabExecutionMode, TabExecutionRecord }  from '#Types/db/tabExecutions';

import {
  buildRowsetTruncation,
  mapDispatchedExecutionError,
  orchestratePreparedExecution
}                                                     from '#Pipelines/lib/executionCore/index';
```

Here the shared column stays at 55 because the inline type import is the widest candidate, so the wrapped import aligns with the block instead of its own stacked lines.

### Lone long import

When the wrapped import is the only import, its stacked lines set the `from` column.

Before:

```ts
import { ProblemDetailsSchema, TabExecutionHistoryResponseSchema, TabExecutionParamsSchema } from '@queryai-postgres/resource-api-contracts/tab-executions';
```

After:

```ts
import {
  ProblemDetailsSchema,
  TabExecutionHistoryResponseSchema,
  TabExecutionParamsSchema
}                                     from '@queryai-postgres/resource-api-contracts/tab-executions';
```

The longest stacked line `  TabExecutionHistoryResponseSchema,` is 36 characters, the cursor after it is on odd column 37, so `from` starts on column 39.

### Named re-export block

Before:

```ts
export { default as finishTabExecution } from './finishTabExecution.ts';
export { default as getTabExecution } from './getTabExecution.ts';
export { default as listTabExecutions } from './listTabExecutions.ts';
export { default as startTabExecution } from './startTabExecution.ts';
```

After:

```ts
export { default as finishTabExecution }  from './finishTabExecution.ts';
export { default as getTabExecution }     from './getTabExecution.ts';
export { default as listTabExecutions }   from './listTabExecutions.ts';
export { default as startTabExecution }   from './startTabExecution.ts';
```

## Utility script

Use the repository script for this skill:
- Script path: `tooling/code-style/typescript-import-layout.mjs`
- Run `pnpm lint:imports` or `pnpm fmt:imports` from the owning workspace package, such as `apps/server`, `apps/web`, `apps/database`, or a package that defines those scripts. The repository root does not define those two aliases.
- From the repository root, invoke the script directly with `node tooling/code-style/typescript-import-layout.mjs` and add `--fix` when applying changes.
- Limit package-scoped commands with either `--file <path>` or paths after `--`, for example `pnpm lint:imports --file src/apis/endpoints/db/tabExecutions/getTabExecution.ts` from `apps/server`.
- Positional targeting still works, for example `pnpm lint:imports -- src/apis/endpoints/db/tabExecutions/getTabExecution.ts` from the owning workspace package.
- For one-file formatting that also applies the object-layout, parameter-layout, and const-layout formatters, use `pnpm fmt:file --file src/apis/endpoints/db/tabExecutions/getTabExecution.ts`

## Checklist

Before finishing, verify:
- All `import type` lines come before regular `import` lines
- `import 'server-only';` stays at the top when present
- There is exactly one blank line after `import 'server-only';` when other imports follow
- No regular `import` statement contains inline `type` specifiers
- The separator blank line follows the 2-import / 3-import exception rules
- `from` starts in the same column across the import block
- `from` starts in the same column across any contiguous named re-export block
- The shared `from` column does not exceed `57`
- Overlong named imports wrap instead of pushing the whole block wider
- A wrapped import or re-export anchors on its longest stacked specifier line when it sets the block's alignment
- There are exactly two blank lines after the final import
- There are exactly two blank lines before the bottom export group
- There are no blank lines inside the bottom export group
