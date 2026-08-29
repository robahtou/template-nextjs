# Imported Assets Context

## Ownership

`src/assets` owns static, non-executable resources imported by application source and processed by the build. React components, services, hooks, and utility functions do not belong here.

The baseline asset tree contains the [`styles`](styles/CONTEXT.md) system. Add another asset folder only when shipped source imports real product-owned files from it.

## Imported assets versus public files

- Put an asset under `src/assets` when source code imports it and the bundler should fingerprint or process it.
- Put a file under `public/` when consumers require a stable URL that bypasses module imports.
- Prefer current App Router file-based metadata for icons, social images, and manifests rather than manual `<head>` links.

Do not add placeholder binaries, icons, favicons, manifests, or brand files to advertise an optional capability. A web manifest is a product decision with real icons, names, colors, start behavior, and installability testing.

## Font policy

The template uses system-font stacks defined by the [global style system](styles/CONTEXT.md). This avoids network downloads, missing local files, and undeclared font licenses.

If a downstream product adopts local fonts, add the licensed binaries and their source integration in the same change. Document family, format, available styles and weights, fallback stack, preload/subsetting decision, attribution, and delivery expectations. Remove unused files rather than retaining speculative fallbacks.

## Change checklist

1. Confirm the asset is required and that its license permits the intended delivery.
2. Choose imported or stable-URL ownership based on how code consumes it.
3. Add accessible text alternatives or decorative treatment at each usage site.
4. Check output size, caching, and responsive behavior where relevant.
5. Update this context only if asset ownership or policy changes.

See the [adoption context](../../docs/adoption/CONTEXT.md) for product identity and PWA decisions and the [App Router context](../app/CONTEXT.md) for metadata ownership.
