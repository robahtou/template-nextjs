# Shared Components Context

## Ownership

`src/components` owns React UI whose contract is shared by multiple routes. Keep route-only UI in the route's `_components` folder and keep domain orchestration in [`src/lib`](../lib/CONTEXT.md) or a justified future feature boundary.

`ThemeToggle` is the current shared interactive leaf. A component is not shared merely because it might be useful later.

## Component contract

- Server Components are the default. Add `'use client'` only for browser APIs, effects, event handlers, local state, or client-only context.
- Keep client boundaries narrow and accept only minimal serializable props from server parents.
- Keep styles beside the component in `styles.module.css` and consume tokens from the [global style system](../assets/styles/CONTEXT.md).
- Expose semantic elements and typed props before adding wrapper abstractions.
- Define loading, disabled, empty, error, and success behavior when the component owns those states.
- Preserve visible focus, keyboard and touch parity, useful names/descriptions, non-nested controls, and restrained live-region behavior.
- Never use component visibility or disabled state as authorization.

## CSS Modules example

```tsx
// src/components/Notice/index.tsx
import type { ReactNode } from 'react';
import styles from './styles.module.css';

type NoticeProps = {
  children: ReactNode;
};

function Notice({ children }: NoticeProps) {
  return <aside className={styles['notice']}>{children}</aside>;
}

export default Notice;
```

```css
/* src/components/Notice/styles.module.css */
.notice {
  padding: var(--16px);
  border: var(--border-1) solid var(--border-color);
  border-radius: var(--radius-8);
  background: var(--surface-2);
  color: var(--text-primary);
}
```

CSS Modules are the executable baseline. Replacing that styling architecture requires an explicit project decision and corresponding dependency, configuration, implementation, and guidance changes.

## Promotion and maintenance

Before moving a route-private component here, confirm at least two routes need the same behavior, remove route assumptions from its API, and move its styles and verification with it. Move a component back to route ownership when reuse disappears.

See the [route-private component context](../app/_components/CONTEXT.md) and [architecture context](../../docs/architecture/CONTEXT.md). Update this guide only when shared-component boundaries or conventions change.
