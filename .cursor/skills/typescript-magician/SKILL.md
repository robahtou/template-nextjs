---
name: typescript-magician
description: Designs and diagnoses advanced TypeScript 7 type-system behavior. Use when difficult inference, narrowing, conditional or mapped types, overloads, or nominal distinctions are the core problem; not for ordinary edits or import, object, and parameter layout.
---

# Advanced TypeScript

Use this skill when the type system itself is the problem. Do not turn routine annotations, component props, or straightforward compiler errors into type-level abstractions.

The template uses TypeScript 7 with strict checking, bundler module resolution, isolated modules, and Next-generated types. Confirm `package.json` and `tsconfig.json` when a downstream project may have changed that contract.

## Approach

1. Reproduce the diagnostic with the repository compiler and identify the smallest boundary where the actual and expected types diverge.
2. Keep runtime behavior and ownership boundaries primary. Prefer types derived from real values or existing declarations over parallel hand-maintained shapes.
3. Use the simplest mechanism that preserves the required relationship: narrowing before assertions, standard utilities before custom transforms, and a union or generic before overloads.
4. Treat assertions and `any` as explicit boundary decisions rather than automatic failures. Prefer `unknown` for untrusted input and validate it before use; isolate any unavoidable type hole.
5. Verify repository changes with `pnpm typecheck`. For design-only work, a focused probe using the installed TypeScript 7 compiler is sufficient until code is integrated. Add type tests only when acceptance or rejection behavior is a durable contract that ordinary compilation does not already cover.

Avoid recursive or highly distributive types unless their benefit exceeds their compiler and maintenance cost. Do not add a dependency solely to recover inference that TypeScript 7 can express directly.

## Focused references

Read only the references relevant to the current problem:

- [Diagnostics](references/diagnostics.md) for long errors, library declarations, contextual typing, and minimal reproductions.
- [Inference and generics](references/inference-and-generics.md) for constraints, literal preservation, dependent parameters, and `NoInfer`.
- [Narrowing](references/narrowing.md) for discriminated unions, predicates, assertion functions, and untrusted boundaries.
- [Conditional and mapped types](references/conditional-and-mapped-types.md) for distribution, `infer`, key remapping, and bounded transformations.
- [Runtime-derived types](references/runtime-derived-types.md) for `as const`, `satisfies`, `typeof`, indexed access, and standard extraction utilities.
- [Overloads and brands](references/overloads-and-brands.md) only when call shapes require overloads or structurally identical values need a justified nominal distinction.
