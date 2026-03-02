# Assets Directory Context

## Purpose

`src/assets` is for static, non-executable resources that are imported by the app build/runtime.

Keep business logic out of this directory. Do not place React components, hooks, services, or utility functions here.

## Current Structure

```text
src/assets/
├─ fonts/
│  ├─ *.woff2         # local font binaries
│  └─ font-info.txt   # delivery/cache guidance for font files
└─ styles/
   ├─ index.css       # single global styles entrypoint
   ├─ *.css           # layered style slices (normalize, base, themes, etc.)
   └─ CONTEXT.md      # style system contract and ownership rules
```

## Contracts

### Fonts

- Store local font binaries in `src/assets/fonts`.
- Register fonts in `src/lib/fonts.ts` via `next/font/local`.
- Prefer `woff2` for local web fonts.
- Keep `font-info.txt` current when delivery/caching guidance changes.

### Styles

- Import global styles through one file only: `@Styles/index.css`.
- Keep cascade-layer order and global import orchestration in `src/assets/styles/index.css`.
- Keep style-file intent and ownership in `src/assets/styles/CONTEXT.md`.
- Avoid importing leaf global style files directly from app entrypoints.

## Decision Guide

- Use `src/assets` when an asset is imported into source code (for example, fonts and global styles).
- Use `public/` when a file should be URL-addressable at a fixed path without an import (for example, favicon files and manifest files).

## Change Checklist

1. Place the asset in the correct folder (`fonts` or `styles`).
2. Wire it in the corresponding integration point:
   - Fonts: `src/lib/fonts.ts`
   - Styles: `src/assets/styles/index.css`
3. Update docs if the contract or structure changes:
   - `src/assets/CONTEXT.md`
   - `src/assets/styles/CONTEXT.md` (if style-specific behavior changed)
