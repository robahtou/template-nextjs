---
name: runtime-derived-types
description: Derive TypeScript types from authoritative runtime values without duplicating contracts
metadata:
  tags: typescript, typeof, satisfies, as-const, indexed-access
---

# Runtime-Derived Types

## Keep one source of truth

When a finite runtime value is authoritative, derive its type with `typeof`, `keyof`, and indexed access instead of repeating a union:

```typescript
const phases = ['idle', 'running', 'complete'] as const;

type Phase = (typeof phases)[number];

const nextPhases = {
  idle: ['running'],
  running: ['idle', 'complete'],
  complete: [],
} as const satisfies Record<Phase, readonly Phase[]>;

type NextPhase<Current extends Phase> =
  (typeof nextPhases)[Current][number];
```

The separate `phases` tuple closes the value universe: `satisfies Record<Phase, readonly Phase[]>` rejects an unknown destination as well as a missing key. `Record<string, readonly string[]>` would check only broad string shapes and would not establish that destinations are keys of the same table. A generic table helper can enforce that relationship when a separate runtime list would be redundant.

`as const` preserves literals and produces readonly properties and tuples; it does not freeze the runtime value. Do not use it when the API promises mutable widened data.

`satisfies` checks a value against a constraint without replacing the value's inferred type. Use an annotation instead when consumers should see exactly the annotated abstraction rather than the more specific implementation type.

## Derive function contracts carefully

Standard utilities can keep wrappers synchronized with an authoritative function:

```typescript
declare function load(input: URL): Promise<Uint8Array>;

type LoadInput = Parameters<typeof load>[0];
type LoadResult = Awaited<ReturnType<typeof load>>;
```

For overloaded functions, `Parameters` and `ReturnType` do not preserve the full overload set; read the overload guidance before wrapping one.

Deriving a public type from a private implementation couples callers to incidental changes. Prefer an explicit exported contract when stability or abstraction matters, even if the implementation structurally satisfies it.

## Separate inference from validation

Runtime-derived types describe project-owned values. They do not prove that external JSON, request data, or storage matches those values. Validate external data first and derive types from an existing schema only when that schema is the actual runtime authority.

At generic API boundaries, use a `const` type parameter when inline literals should be retained without forcing every caller to write `as const`.
