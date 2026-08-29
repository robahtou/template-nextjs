---
name: inference-and-generics
description: Design TypeScript generics that preserve real relationships and predictable inference
metadata:
  tags: typescript, generics, inference, constraints, noinfer
---

# Inference and Generics

## Encode relationships, not decoration

A type parameter should normally relate at least two positions or preserve information for the return type. If a parameter occurs only once, a concrete type or union is usually clearer.

```typescript
function getProperty<ObjectType, Key extends keyof ObjectType>(
  value: ObjectType,
  key: Key,
): ObjectType[Key] {
  return value[key];
}
```

Constrain only the operations the implementation needs. Overly broad object shapes reject useful inputs and can widen literals before inference occurs.

## Preserve literals deliberately

Use a `const` type parameter for an API that should capture literal arrays or object members supplied inline:

```typescript
function defineValues<const Values extends readonly string[]>(
  values: Values,
): Values {
  return values;
}

const values = defineValues(['idle', 'active']);
// readonly ['idle', 'active']
```

This replaces most recursive narrowing helpers. Use ordinary type parameters when callers need widened or mutable results; literal preservation is not universally desirable.

Do not add `const` mechanically to a type parameter already inferred from a finite literal union. It is useful when an inline object or array would otherwise widen, not as a general marker for precision.

## Control inference sources

TypeScript can infer one parameter from several arguments. Use the built-in `NoInfer` when one argument must be checked against a type selected elsewhere rather than participate in selecting it:

```typescript
declare function choose<const Value>(
  options: readonly Value[],
  fallback: NoInfer<Value>,
): Value;

choose(['idle', 'active'] as const, 'idle');
choose(['idle', 'active'] as const, 'other'); // error
```

Before adding `NoInfer`, confirm which argument should own the type decision. It should express API intent, not mask a poorly related signature.

## Keep callbacks contextual

Place the value that establishes a type before callbacks that depend on it, and connect the callback's result through a separate parameter:

```typescript
function transform<Input, Output>(
  value: Input,
  map: (value: Input) => Output,
): Output {
  return map(value);
}
```

When a callback parameter becomes unexpectedly broad, inspect variance and every inference candidate before adding explicit type arguments. Explicit arguments are useful for caller intent but should not be the routine repair for a signature that cannot infer its own relationships.

## Avoid type-state without a real state machine

Generic accumulation can model builders and fluent APIs, but it also creates assertions and hard-to-read intersections. Use it only when call order or accumulated keys are part of the public contract. Prefer a validated final object when runtime construction is the actual requirement.
