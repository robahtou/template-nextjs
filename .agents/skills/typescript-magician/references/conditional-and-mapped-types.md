---
name: conditional-and-mapped-types
description: Build bounded conditional and mapped types with deliberate union behavior
metadata:
  tags: typescript, conditional-types, mapped-types, infer, distribution
---

# Conditional and Mapped Types

## Prefer existing utilities

Check `Awaited`, `Parameters`, `ReturnType`, `Pick`, `Omit`, `Extract`, `Exclude`, `Record`, `Partial`, and `Required` before defining a custom transformation. A named project type is still preferable when it represents a domain contract rather than a mechanical transformation.

## Make distribution intentional

A conditional whose checked side is a naked type parameter distributes over unions:

```typescript
type ElementOf<Value> = Value extends readonly (infer Element)[]
  ? Element
  : never;

type Elements = ElementOf<readonly string[] | readonly number[]>;
// string | number
```

Wrap both sides in tuples when the condition should inspect the union as a whole:

```typescript
type AllArrays<Value> = [Value] extends [readonly unknown[]]
  ? true
  : false;

type Mixed = AllArrays<string | readonly number[]>;
// false
```

Use `never` to filter distributed union members. Confirm that filtering is intended; an unexpected `never` often means the input failed a pattern rather than that the caller supplied no value.

## Extract only the structure needed

Use `infer` inside a conditional to capture a meaningful part of a known structure:

```typescript
type PayloadOf<Value> = Value extends { payload: infer Payload }
  ? Payload
  : never;
```

Prefer built-in extraction utilities for functions and promises. Custom recursive unwrapping can differ from platform thenable behavior or reach compiler instantiation limits.

## Map keys and modifiers deliberately

Mapped types can preserve, add, or remove modifiers and can remap string keys:

```typescript
type Mutable<Value> = {
  -readonly [Key in keyof Value]: Value[Key];
};

type ChangeHandlers<Value> = {
  [Key in keyof Value as Key extends string
    ? `on${Capitalize<Key>}Change`
    : never]: (value: Value[Key]) => void;
};
```

Template literal types describe compile-time string patterns; they do not validate arbitrary runtime strings. Keep runtime parsers authoritative and use type-level parsing only for finite, caller-visible literal APIs.

## Bound recursive transformations

Naive deep mapped types commonly mishandle functions, arrays, dates, maps, branded values, and recursive structures. Define explicit terminal cases and depth only when the repository has a concrete deep-transform contract. Otherwise transform the known shape directly.

Large union cross-products and recursive conditional types can materially slow the compiler and editor. Measure the benefit at call sites and simplify when an explicit interface or small union is easier to understand.
