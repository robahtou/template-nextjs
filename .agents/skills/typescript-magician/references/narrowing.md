---
name: narrowing
description: Model runtime cases with sound TypeScript control-flow narrowing
metadata:
  tags: typescript, narrowing, unions, predicates, assertions
---

# Narrowing

## Start with a discriminated union

When runtime cases have different data, give each case a stable literal discriminant. This keeps the runtime check and the type relationship aligned.

```typescript
type Result<Value> =
  | { status: 'success'; value: Value }
  | { status: 'failure'; message: string };

function describe(result: Result<number>): string {
  switch (result.status) {
    case 'success':
      return String(result.value);
    case 'failure':
      return result.message;
    default:
      return assertNever(result);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
```

Prefer direct discriminant checks over assertions. Truthiness is appropriate only when values such as `0` and an empty string do not represent distinct valid states.

## Validate unknown boundaries

Types do not validate request data, parsed JSON, storage, environment values, or data returned by an untyped dependency. Keep these values `unknown` until a runtime check establishes the required shape:

```typescript
function hasStringCode(value: unknown): value is { code: string } {
  return typeof value === 'object'
    && value !== null
    && 'code' in value
    && typeof value.code === 'string';
}
```

A predicate is a promise to the compiler. Its body must establish the entire target type, not merely a convenient property. Prefer a schema already owned by the project when one exists; do not add a validation dependency solely for a small local check.

## Predicates and assertion functions

Allow TypeScript 7 to infer a predicate when its implementation is simple and the inferred result serves callers. Write an explicit `value is Type` return when it is part of a public API or inference cannot express the intended contract.

Assertion functions may be declarations or explicitly typed function values:

```typescript
type AssertString = (value: unknown) => asserts value is string;

const assertString: AssertString = (value) => {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a string');
  }
};
```

Use an assertion function only when failure should throw. A predicate is clearer when the caller owns the alternative path.

## Preserve control-flow evidence

Mutation, aliasing, and deferred callbacks can invalidate facts used for narrowing. Capture a stable value or validate close to the operation when the value can change. Avoid broad casts intended only to make a narrowing survive across unrelated code.

The `in` operator proves property presence, not the complete shape of its value. With optional properties, a union member can remain possible on both branches. Follow presence checks with value checks when the operation requires them.
