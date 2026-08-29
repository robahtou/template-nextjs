---
name: react-nextjs-best-practices
description: Applies generic React and Next.js performance practices. Use when reviewing render cost, client bundle size, data waterfalls, streaming, state placement, or interaction responsiveness.
---
# React and Next.js Performance Practices

Use project rules and measured application behavior as the source of truth.

- Keep server-renderable work on the server and minimize Client Component boundaries, props, and third-party client code.
- Start independent data work together and stream independent regions with purposeful `Suspense` boundaries.
- Avoid request waterfalls, duplicate reads, and serialized work that has no dependency.
- Keep state close to its consumers; derive values during render and reserve effects for external synchronization.
- Preserve pure rendering and stable identities so React Compiler can optimize safely.
- Split or defer expensive client code only when bundle or interaction evidence supports it.
- Use framework image, font, metadata, and navigation primitives where they improve delivery and correctness.

Do not trade correctness, accessibility, cache isolation, or maintainability for a synthetic metric.
