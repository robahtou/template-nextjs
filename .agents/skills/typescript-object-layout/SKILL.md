---
name: typescript-object-layout
description: "Formats multiline TypeScript and JavaScript object-like blocks in this repository. Aligns `:` in multiline object literals and type literal property members, expands shorthand object properties to explicit `key : value` pairs, includes quoted keys in alignment, preserves object-method shorthand, and keeps spacing consistent across the whole object. Use when editing or reviewing multiline object literals or TypeScript object type blocks."
---

# TypeScript Object Layout

## When to use

Use this skill when you need to:
- Format multiline object literals in `.ts`, `.tsx`, `.js`, or `.jsx`
- Format multiline TypeScript object type blocks such as `type X = { ... }`
- Format inline parameter object types such as `params: { ... }`
- Align object keys before `:`

## Scope

This skill is about object-member layout only.
- Preserve semantics.
- Preserve member order unless the user explicitly asks for reordering.
- Align across the whole object, even if blank lines appear inside the block.
- Preserve object-literal method shorthand such as `reset() { ... }`.
- Preserve type-object method signatures such as `init(scopeKey, params): Result;`.

## Rules

### 1. Supported blocks

Apply this rule to multiline blocks only:
- object literals like `return { ... }`
- type literals like `type X = { ... }`
- inline parameter object types like `params: { ... }`

Do not apply it to single-line object fragments such as:
- `{ ok: true }`
- `{ code?: string; message: string }`

### 2. Alignable members

Count and align only explicit `key: value` or `key?: value` members.

Include:
- identifier keys like `foo`
- optional keys like `error?`
- quoted keys like `'content-type'`
- readonly type members like `readonly foo`
- object-literal properties whose value continues on later lines

Object-literal shorthand properties should be expanded first:

Before:

```ts
const snapshot = {
  error,
  returnedRows: returnedRows
};
```

After:

```ts
const snapshot = {
  error        : error,
  returnedRows : returnedRows
};
```

### 3. Keys that do not participate

Do not rewrite these into `key : value` form:
- object-literal methods like `reset() { ... }`
- type method signatures like `init(scopeKey, params): Result;`
- spread entries like `...other`
- computed keys like `[expr]: value`
- index signatures and other unsupported type members

Preserve them as-is.

### 4. Alignment target for `:` members

Measure the longest participating key in the whole block.

Then choose the padding target with these rules:

1. If there is exactly 1 participating member:
   - no padding before `:`
   - use `key: value`
2. If there are exactly 2 participating members:
   - align to the longest key
   - do not add the odd/even extra spacing rule
3. If there are 3 or more participating members:
   - compute the rendered column immediately after the longest key
   - if that column is odd, add 2 spaces before `:`
   - if that column is even, add 1 space before `:`

Equivalent formula for 3 or more participating members:
- `columnAfterLongestKey = baseIndent.length + 2 + maxLen + 1`
- `target = maxLen + (columnAfterLongestKey % 2 === 1 ? 2 : 1)`

Then pad every shorter key so all `:` align vertically.

### 5. Quoted keys

Quoted keys participate using their written length, including quotes.

Example:

```ts
const headers = {
  accept          : 'application/json',
  'content-type'  : 'application/json',
  authorization   : token
};
```

### 6. Method members

Object-literal methods stay shorthand:

```ts
const snapshot = {
  queryTabExecutionId : queryTabExecutionId,
  returnedRows        : returnedRows,
  reset() {
    clearSnapshot();
  }
};
```

Type-object method signatures also stay shorthand:

```ts
export type TabExecutionResultsStore = {
  init       (scopeKey: TabExecutionResultsScopeKey, params: InitTabExecutionSnapshotParams): InitTabExecutionSnapshotResult;
  setColumns (scopeKey: TabExecutionResultsScopeKey, columns: ColumnDef[]): SetColumnsResult;
  appendRows (scopeKey: TabExecutionResultsScopeKey, rowsBatch: unknown[][], bytesAdded: number): AppendRowsResult;
};
```

## Examples

### Type literal properties

Before:

```ts
export type TabExecutionResultsMeta = {
  queryTabExecutionId  : UUIDv7;
  queryTabId           : UUIDv7;
  dataQueryId          : UUIDv7;
  nonce                : number;
};
```

After:

```ts
export type TabExecutionResultsMeta = {
  queryTabExecutionId : UUIDv7;
  queryTabId          : UUIDv7;
  dataQueryId         : UUIDv7;
  nonce               : number;
};
```

### Two-member exception

```ts
{
  tenancy  : Tenancy;
  principal: VerifiedPrincipal;
}
```

### Runtime object literal

Before:

```ts
return {
  maxRows: value.maxRows,
  returnedRows: value.returnedRows,
  hasMore: value.hasMore,
  isTruncated: value.isTruncated,
  reason: value.reason,
  totalRows: null
};
```

### Multiline value still participates

```ts
return {
  ok  : false,
  code: isControlPlaneBootstrapMissing(normalizedReservationError)
    ? 'CONTROL_PLANE_BOOTSTRAP_REQUIRED'
    : 'CONTROL_PLANE_RESERVATION_FAILED'
};
```

After:

```ts
return {
  maxRows       : value.maxRows,
  returnedRows  : value.returnedRows,
  hasMore       : value.hasMore,
  isTruncated   : value.isTruncated,
  reason        : value.reason,
  totalRows     : null
};
```

## Utility script

Use the repository script for this skill:
- Script path: `tooling/code-style/typescript-object-layout.mjs`
- Run `pnpm lint:objects` or `pnpm fmt:objects` from the owning workspace package. The repository root does not define those two aliases.
- From the repository root, invoke the script directly with `node tooling/code-style/typescript-object-layout.mjs` and add `--fix` when applying changes.
- Limit package-scoped commands with either `--file <path>` or paths after `--`, for example `pnpm fmt:objects --file src/lib/tabExecutionResultsStore.ts` from the owning workspace package.
- Positional targeting still works, for example `pnpm fmt:objects -- src/lib/tabExecutionResultsStore.ts` from the owning workspace package.
- For one-file formatting that also applies the import-layout, parameter-layout, and const-layout formatters, use `pnpm fmt:file --file src/lib/tabExecutionResultsStore.ts`

What the script handles:
- multiline object literals
- multiline type literals
- inline parameter object types
- shorthand property expansion
- quoted keys
- object-literal properties with multiline values

What the script preserves:
- object-literal methods
- type method signatures
- spreads and unsupported members

## Checklist

Before finishing, verify:
- multiline `key : value` members align `:`
- multiline object-literal values still participate in key alignment
- 2-member blocks use the longest key with no extra odd/even padding
- 3+ member blocks use the odd/even padding rule
- shorthand properties are expanded to explicit `key : value`
- quoted keys participate in alignment
- method shorthand remains method shorthand
