---
name: modules
description: Native ESM conventions for repository tooling and Node-only application code
metadata:
  tags: modules, esm, nextjs, imports, boundaries
---

# Node.js Modules

## Project contract

`package.json` is authoritative for the runtime and package manager. This template uses `"type": "module"` and `.mjs` for directly executed repository tooling.

Use `node:` specifiers for built-ins and explicit extensions for relative imports in native Node files:

```javascript
import { readFile } from 'node:fs/promises';

import { parseRecord } from './parse-record.mjs';

const fixtureUrl = new URL('./fixtures/record.json', import.meta.url);
const record = parseRecord(await readFile(fixtureUrl, 'utf8'));
```

Resolve script-relative files from `import.meta.url`. Use `process.cwd()` only when the command explicitly requires execution from the project root.

## Keep the two module environments distinct

- Files under `scripts` and `tooling` run directly in Node. Use `.mjs`, native ESM resolution, and `node:` imports.
- Files under `src` are compiled by Next.js with the repository's `moduleResolution: "bundler"` configuration. Follow existing aliases and local import conventions there; do not rewrite application imports to Node-style `.js` specifiers.
- Node built-ins must not enter a Client Component dependency graph. Use them only in repository tooling or application code guaranteed to run in the Node.js server runtime.
- An Edge runtime does not provide the full Node.js API. Confirm the route runtime before importing a built-in.

## Exports and boundaries

Prefer named exports. Import implementation modules directly when a barrel would obscure a server/client boundary or pull unrelated code into a bundle.

Keep dynamic import targets finite when input is not trusted:

```javascript
const loaders = {
  json: () => import('./formats/json.mjs'),
  text: () => import('./formats/text.mjs'),
};

const loadFormat = (name) => loaders[name]?.();
```

Do not interpolate user-controlled paths into `import()`. Validate the selected key and reject unsupported values.

## CommonJS interoperation

Do not add new `require`, `module.exports`, or `.cjs` modules. When a dependency exposes only CommonJS, isolate the compatibility code at one boundary and preserve ESM throughout project-owned code. Use `createRequire(import.meta.url)` only when native `import` cannot load the required interface.
