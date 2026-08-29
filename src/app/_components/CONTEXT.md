# Route-Private Components Context

## Ownership

`src/app/_components` holds React UI private to the surrounding root route tree. The underscore keeps the folder out of the URL. For a nested route, prefer `<segment>/_components` so ownership remains visible.

Use [`src/components`](../../components/CONTEXT.md) only when multiple routes genuinely share the same UI contract.

## Boundaries

- Start with a Server Component and add `'use client'` only to the smallest interactive leaf.
- Keep route reads and authorization in the owning page, layout, action, or server library; presentation components do not decide access.
- Pass minimal typed props rather than importing route-wide state into every child.
- Keep a component's selectors in a colocated `styles.module.css`.
- Preserve semantic HTML, keyboard and touch parity, visible focus, useful names, and understandable loading/error states.

If a private component becomes shared, move its implementation, styles, and tests together and update all imports. If it grows into domain behavior spanning routes, evaluate a real `src/features/<domain>` boundary instead of treating this folder as a general component dump.

## Maintenance

The parent [App Router context](../CONTEXT.md) owns route structure and framework boundaries. Update this file only when route-private component ownership or promotion rules change; normal component additions do not require documentation edits.
