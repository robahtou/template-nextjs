# Styles System Context

## Purpose

This directory contains the app-wide style system. It is intentionally organized by **responsibility** (reset, tokens, semantics, typography, utilities, etc.) so each file has a clear ownership boundary.

## Single Entrypoint

Global styles are loaded through one file:

- `src/assets/styles/index.css`

`index.css` is the only place that should orchestrate global style imports and cascade-layer order.

## Layer Contract

The cascade contract is defined in `index.css`:

1. `normalize`
2. `base`
3. `scale`
4. `themes`
5. `semantics`
6. `typography`
7. `motion`
8. `layouts`
9. `forms`
10. `a11y`
11. `scrollbars`
12. `prose`
13. `print`
14. `utilities`

Higher numbers win in conflicts. Keep this order stable unless there is a deliberate architecture change.

`mediaQueries.css` is not a layer. It defines `@custom-media` breakpoints that other files may use.

## When To Use Which File

- `normalize.css`: Browser normalization only; no design decisions.
- `base.css`: Global element defaults (`html`, `body`, links, core behavior).
- `scale.css`: Primitive design tokens (size, spacing, radii, borders, shadows, z-index, durations).
- `themes.css`: Theme primitives and dark/light mode switching.
- `semantics.css`: Semantic tokens derived from theme primitives (roles like success/warning/surfaces).
- `typography.css`: Font families, heading/body typographic defaults, text rhythm.
- `mediaQueries.css`: Shared breakpoint aliases via `@custom-media`.
- `layouts.css`: Global layout primitives and container-query scaffolding.
- `forms.css`: Baseline styles for form controls and button primitives.
- `a11y.css`: Accessibility helpers (skip links, assistive patterns).
- `scrollbars.css`: Cross-browser scrollbar styling.
- `prose.css`: Readability defaults for long-form content containers.
- `print.css`: Print-only behavior and cleanup.
- `motion.css`: Keyframes and reusable motion utility classes.
- `utilities.css`: Small, generic utility classes for one-off composition.
- `index.css`: Layer contract + ordered imports for all global style slices.

## Ownership Rules

1. One file = one concern.
2. Keep token definition files free of element/class styling.
3. Keep element/class styling files free of token definition.
4. If a new concern appears, add a dedicated file and register it in `index.css`.
5. Avoid hidden imports between leaf files; `index.css` should remain the orchestration point.

## Improvement Examples: Avoid Mixed Responsibilities

### Example 1: Typography tokens mixed with element rules

Before (mixed in one place):

```css
/* typography.css */
:root {
  --heading-display-size: clamp(2rem, 3vw, 4rem);
}

h1 {
  font-size: var(--heading-display-size);
}
```

After (split by concern):

```css
/* typography.tokens.css */
:root {
  --heading-display-size: clamp(2rem, 3vw, 4rem);
}
```

```css
/* typography.css */
h1 {
  font-size: var(--heading-display-size);
}
```

### Example 2: Theme primitives mixed with component behavior

Before (theme + component rules together):

```css
/* themes.css */
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

.card {
  background: var(--background);
  border: 1px solid color-mix(in oklch, var(--foreground) 20%, transparent);
}
```

After (theme primitives remain in `themes.css`, component behavior moves):

```css
/* themes.css */
:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

```css
/* utilities.css or component styles module */
.card {
  background: var(--background);
  border: 1px solid color-mix(in oklch, var(--foreground) 20%, transparent);
}
```

### Example 3: Form tokens mixed with control rules

Before (definitions + usage in one file):

```css
/* forms.css */
:root {
  --form-control-height: 2.5rem;
}

input,
select,
textarea {
  min-height: var(--form-control-height);
}
```

After (token in `scale.css`, usage in `forms.css`):

```css
/* scale.css */
:root {
  --form-control-height: 2.5rem;
}
```

```css
/* forms.css */
input,
select,
textarea {
  min-height: var(--form-control-height);
}
```

If you introduce a new split file (for example, `typography.tokens.css`), add it to `index.css` and place it in the correct layer/ordering slot.
