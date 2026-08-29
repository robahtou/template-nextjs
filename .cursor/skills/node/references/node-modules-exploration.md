---
name: node-modules-exploration
description: Inspecting pnpm-installed packages and module resolution without relying on layout accidents
metadata:
  tags: node-modules, pnpm, dependencies, resolution, packages
---

# Exploring node_modules

## Start with authoritative sources

Use the root `package.json` for declared dependencies, runtime constraints, and the pinned package manager; use `pnpm-lock.yaml` for resolved dependency state and the installed package only for the implementation actually present on disk. Do not substitute npm or Yarn commands.

```bash
pnpm list --depth 0
pnpm why next
pnpm list next --depth Infinity
```

For automation, prefer a pnpm command's JSON output over parsing decorative terminal output.

## Resolve before traversing

Ask Node which entry point its ESM resolver selects:

```bash
node --input-type=module --eval "console.log(import.meta.resolve('next'))"
```

Then inspect the package manifest and its declared `exports`, `imports`, `types`, `main`, `module`, and `engines` fields as relevant:

```bash
sed -n '1,220p' node_modules/next/package.json
```

List the resolved package directory before searching it. Read its README, type declarations, source map, or shipped source only when those artifacts answer the question.

## Account for pnpm layout

pnpm links direct dependencies into the root `node_modules` and keeps package instances in `node_modules/.pnpm`. Do not assume npm-style hoisting, construct `.pnpm` paths from package names, or import a transitive package merely because it is reachable on disk.

- Use `pnpm why <package>` to identify the dependency chain.
- Use `readlink` or `realpath` when the symlink target matters.
- Inspect the exact installed version when multiple versions are present.
- Treat platform-specific `@next/swc-*` packages as optional dependencies selected for the current platform, not universal direct dependencies.

## Resolution failures

Check, in order:

1. The package is declared in the correct manifest.
2. The lockfile contains the expected resolution.
3. Installation completed with the repository's pnpm version.
4. The requested subpath is permitted by the package's `exports` map.
5. The importing file is running under the intended environment: native Node ESM, Next.js bundling, or browser code.

Never edit `node_modules`. Make durable changes through a manifest and lockfile update, and do not execute dependency-provided scripts solely to inspect package contents.
