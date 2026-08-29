---
name: typescript-diagnostics
description: Diagnose difficult TypeScript errors without changing the inference surface accidentally
metadata:
  tags: typescript, diagnostics, inference, declarations
---

# Diagnostics

## Use the repository compiler

Run `pnpm typecheck`; it generates Next types before checking the configured project. TypeScript 7 rejects root file arguments when a `tsconfig.json` is present unless `--ignoreConfig` is used. That flag also bypasses bundler resolution, path aliases, generated route types, and framework plugins, so it is not a substitute for the project check.

Capture the diagnostic code and the complete assignability chain. The deepest line often identifies the incompatible member, but the root cause can be an earlier inference choice, overload selection, or widened value.

## Locate the first divergence

Compare the type at each boundary:

1. the source value;
2. the inferred generic arguments;
3. the selected overload or contextual signature;
4. the declared destination type.

Use editor hovers and go-to-definition, then inspect the installed `.d.ts` file when library behavior is involved. Check the declaration resolved by bundler mode instead of assuming that a package's documentation describes the installed entry point.

For object-shaped results, a temporary display alias can make a transformation readable without claiming to change it:

```typescript
type Inspect<T> = { [Key in keyof T]: T[Key] } & {};

type Actual = Inspect<typeof value>;
const checked = value satisfies Expected;
```

`satisfies` probes assignability while retaining the expression's inferred type. Remove diagnostic-only aliases after the cause is clear.

## Reduce without hiding the bug

A useful reproduction retains the same contextual typing, generic call, readonly state, and union members. Moving an expression into an unannotated variable may widen a literal and either create or hide the original error.

Common causes of long diagnostics include:

- literal widening or an unexpected readonly tuple;
- loss of correlation between a key and its indexed value;
- a distributive conditional operating on each union member;
- optional properties being confused with properties whose values include `undefined`;
- an overload implementation signature being mistaken for a callable overload;
- a callback contributing an unintended inference candidate;
- external input being typed before runtime validation.

When a method is called on a union of container types, its parameter must be valid for every member. The compatible parameter can therefore become an intersection and collapse to `never`. This commonly appears after indexing a literal table with a generic key: the public key/value relationship may be sound even though the selected row is represented as a union of distinct tuples. Widen only the local row used by the runtime operation, not the caller-facing signature.

For design-only exploration, use the installed TypeScript 7 compiler with an in-memory program or an isolated file and explicit compiler options. Treat that as a focused inference probe, not evidence that the code works under the full Next project configuration.

## Choose the correction

Correct the earliest inaccurate contract. Add a generic relationship when two positions must stay correlated, narrow an honest union when runtime cases differ, or update a stale declaration when the runtime API is known.

A type assertion is appropriate only when runtime evidence exists that the compiler cannot represent. Keep it at the evidence boundary and assert the narrowest type. Use `@ts-expect-error` only in a focused negative type test where rejection is intentional; do not use it to silence implementation errors.
