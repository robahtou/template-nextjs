---
name: overloads-and-brands
description: Use overloads and nominal brands only when their extra precision has a concrete payoff
metadata:
  tags: typescript, overloads, brands, nominal-types
---

# Overloads and Brands

## Overload only caller-visible relationships

Use overloads when distinct call shapes produce distinct return types and a union or one generic signature would lose useful precision:

```typescript
function convert(value: string): Uint8Array;
function convert(value: Uint8Array): string;
function convert(value: string | Uint8Array): string | Uint8Array {
  return typeof value === 'string'
    ? new TextEncoder().encode(value)
    : new TextDecoder().decode(value);
}
```

Put specific signatures before general fallbacks. The implementation signature must handle every overload but is not itself visible to callers. If the return type does not depend on the input shape, use a union parameter instead.

For a finite key-to-payload relationship, a generic indexed map often scales better than repeated overloads. When wrapping an overloaded function, do not assume `Parameters` or `ReturnType` preserves every signature; mirror the required overloads or expose an intentional interface.

## Brand only meaningful distinctions

TypeScript is structurally typed. A unique-symbol brand can prevent accidental interchange of structurally identical values:

```typescript
declare const brand: unique symbol;

type Brand<Value, Name extends string> = Value & {
  readonly [brand]: Name;
};

type ValidatedValue = Brand<string, 'ValidatedValue'>;
```

A brand has no runtime effect and does not validate a value. Create branded values through a parser or factory that performs the real check, and keep the assertion inside that boundary. Revalidate values arriving from requests, storage, or serialization rather than casting at each call site.

Use a brand when mixing values would cause a real defect or when the type represents completed validation. Do not brand every identifier or primitive; the added factories, assertions, and generic noise must be justified by the distinction.

## Do not confuse brands with secrecy

Branding does not hide data, enforce authorization, or survive an untrusted boundary as evidence. Security properties still require runtime checks and appropriate data handling.
