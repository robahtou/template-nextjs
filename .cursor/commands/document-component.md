# Document a Component

Document the component identified by `$ARGUMENTS`.

1. Inspect its implementation, CSS Module, imports, call sites, and nearest `CONTEXT.md`.
2. Confirm whether it is route-private or shared and whether it crosses a Server/Client Component boundary.
3. Update the nearest `CONTEXT.md` only when the component establishes a durable ownership, behavior, accessibility, styling, or extension contract.
4. Record purpose, public inputs, states, side effects, runtime boundary, styling ownership, accessibility behavior, and safe extension guidance.
5. Link to source paths instead of copying the implementation.
6. Run `pnpm lint:context-md` and any focused code checks affected by the documentation correction.

Do not create a one-off component README or document incidental implementation details.
