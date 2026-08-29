# Global Style System Context

## Baseline

Template-owned route and component styles use colocated `styles.module.css` files. This directory owns only shared tokens, resets, global element behavior, and deliberately global utilities.

CSS Modules are the installed template baseline. A downstream project may replace that architecture only through an explicit dependency, configuration, implementation, and guidance change.

## Single entrypoint

`index.css` declares layer order and imports every global style slice. The root layout imports this entrypoint once. Leaf global files must not import one another or be imported directly by components.

The low-to-high precedence order is:

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

Every declaration in a global slice belongs inside that file's named layer. `mediaQueries.css` is the one exception: it defines shared `@custom-media` aliases and has no cascade declarations.

## File ownership

- `index.css`: layer declaration and ordered imports only.
- `mediaQueries.css`: mobile-first custom media aliases.
- `normalize.css`: browser normalization without product design.
- `base.css`: global document and element defaults.
- `scale.css`: primitive size, spacing, border, radius, motion, elevation, and z-index tokens.
- `themes.css`: light/dark color primitives and theme selection.
- `semantics.css`: role tokens derived from theme primitives, such as text, surface, status, and border roles.
- `typography.css`: neutral `--font-sans` and `--font-display` system stacks, type tokens, and global text hierarchy.
- `motion.css`: shared keyframes and motion helpers; respect reduced-motion preferences.
- `layouts.css`: genuinely global layout primitives and container-query scaffolding.
- `forms.css`: global native control defaults.
- `a11y.css`: skip-link and assistive helpers; never use helpers to hide focus.
- `scrollbars.css`: cross-browser scrollbar behavior.
- `prose.css`: opt-in long-form reading defaults.
- `print.css`: print-only behavior.
- `utilities.css`: small, stable, globally reusable utilities that do not justify a component API.

## Token boundaries

Components consume semantic tokens before raw theme primitives. Keep non-color constants in `scale.css`, theme-selectable color primitives in `themes.css`, and meaning-bearing derived roles in `semantics.css`. Do not create parallel token files unless a real new ownership concern exists.

The default typography uses system fonts and requires no local binaries, network fetch, preload, or font license. Adding a product font requires the real licensed assets, fallback behavior, and an update to the [asset context](../CONTEXT.md).

## Component styling

- Put a component's selectors beside it in `styles.module.css`.
- Use semantic class names and shared tokens; avoid moving one-off component rules into global utilities.
- Keep responsive behavior mobile-first and use shared custom media when the breakpoint is project-wide.
- Preserve visible focus, sufficient contrast, touch target size, reduced motion, text zoom, and forced-color behavior.
- Avoid `!important`; if a cascade conflict requires it, fix ownership or layer placement first.

See the [shared component context](../../components/CONTEXT.md) for the canonical CSS Modules example.

## Maintenance

Change layer order only as an explicit style-architecture decision. When adding or removing a global slice, update `index.css` and this inventory together. Run `pnpm lint:css` for a check, `pnpm fmt` for intentional fixes, and `pnpm verify` before handoff.
