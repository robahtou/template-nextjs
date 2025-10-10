# Writing CSS

- ALWAYS write CSS Modules (NEVER tailwindcss)
- ALWAYS use Bracket Notation in the TSX/JSX react: example `styles['container']`
- ALWAYS be pragmatic in naming classes. It is ok to repeat class names since they will be scoped using CSS MODULES to their components
- ALWAYS lowercase hex colors
- ALWAYS place media/container queries or equivlent at the bottom of the file; keep the sizes organized

# Units & Accessibility

## 0) Project setup

* Keep the root size default: `html { font-size: 100%; }` (don’t use the 62.5% trick).
* Define size tokens in **rem** so they respect user font prefs:

  ```css
  :root{
    --font-14: .875rem; --font-16: 1rem; --font-18: 1.125rem;
    --space-2: .125rem; --space-4: .25rem; --space-8: .5rem; --space-16: 1rem;
  }
  ```

  **Why rem?** It’s "root em": relative to `<html>`’s font size, so it scales when users increase default text size.

## 1) Typography

* **Font sizes:** use **rem** (never px). Example: `body{font-size:var(--font-16)}`.
* **Line-height:** use unitless (e.g., `line-height:1.5`) so it scales with the chosen font size. (MDN best practice.)
* Honor WCAG: text must remain usable at **200%**. Test with larger **default font size** (not just zoom).

## 2) Layout & breakpoints

* **Media queries:** write in **rem**, e.g. `@media (min-width:48rem) { ... }`. This adapts layouts when users prefer larger default text.
* Note: relative units in queries are resolved from initial values (user prefs), not your CSS overrides.

## 3) Spacing rules

* **Vertical rhythm near text** (margins above/below headings, paragraphs): **rem**/**em** so spacing scales with readable text.
* **Horizontal padding/gaps around long text blocks:** prefer **px** to avoid lines getting too short when users enlarge text.

## 4) Visual affordances that shouldn’t scale with text

* **Borders, hairlines, shadows, icon strokes, 1px rules:** use **px**. These shouldn’t thicken just because the user wants bigger text.

## 5) Components

* Let components *flex* with text but avoid clipping:

  * Prefer `min-height` (not fixed `height`) on buttons/inputs that contain text.
  * Add `max-width:100%` guards when widths use rem and content can grow.
* If a component must be a fixed visual size regardless of text, use **px** width/height and allow wrapping.

## 6) Migration checklist (quick pass)

1. **Audit:** replace `font-size: <px>` → **rem** (use tokens).
2. **Breakpoints:** convert `px` → **rem** in media queries; sanity-check at larger default text.
3. **Spacing:** vertical near text → **rem/em**; horizontal gutters near long text → **px**.
4. **Non-text visuals:** borders/shadows/icon strokes → **px**.

## 7) Copy-paste patterns

```css
/* Respect user defaults */
html{font-size:100%;}

/* Type scale (rem) */
body {
  font-size:    var(--font-16); /* 1 rem = 16px */
  line-height:  1.6;
}
h1 {
  font-size:    var(--font-32); /* 2 rem = 32px */
  margin-block: 0 .75em;        /* vertical spacing = relative */
}
p {
  margin-block: .75em;          /* vertical spacing = relative */
}

/* Text containers */
.button{
  font-size:  var(--font-16); /* 1 rem = 16px */
  padding:    8px 16px;       /* px: avoid exploding padding */
  min-height: 2.5rem;         /* rem: grows with text */
  max-width:  100%;
}

/* Rem breakpoints */
@media (min-width:48rem) {
  .layout {
    grid-template-columns: 18rem 1fr; /* 18 rem = 288px */
  }
}

/* Non-text visuals */
.card {
  border:1px solid rgba(0,0,0,.1); /* px */
}
```
