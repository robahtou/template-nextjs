---
name: environment
description: Environment and secret boundaries for Node.js scripts and server-only code in the template.
metadata:
  tags: environment, configuration, secrets, subprocesses
---

# Environment Configuration

The exact Node.js runtime is declared in `package.json`; read that manifest rather than assuming a version. Next.js owns application environment-file loading and `NODE_ENV`. Repository scripts must not create a competing application configuration system.

## Read and Validate at the Boundary

Treat every environment value as optional untrusted text. Validate required values once near the process entry point and pass typed or normalized configuration into lower-level functions:

```js
function requireEnvironmentValue(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }

  if (!/^[1-9]\d*$/u.test(raw)) {
    throw new Error(`${name} must be a positive integer`);
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}
```

Do not scatter `process.env` reads through reusable modules. Do not coerce booleans with `Boolean(process.env.NAME)` because every non-empty string, including `"false"`, becomes `true`.

## Environment Files

- Let Next.js load the application's supported `.env*` files.
- Use the pinned runtime's `process.loadEnvFile()` or `--env-file` only when a standalone script explicitly owns that behavior.
- Resolve an explicitly owned environment-file path from `import.meta.url` or a documented command working directory.
- Never load an arbitrary path supplied by an untrusted caller.
- Keep secrets and local overrides out of version control.

## Subprocesses

Pass a deliberate environment object to subprocesses without mutating global state:

```js
const childEnvironment = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1'
};
```

Remove values the child must not inherit, and never build a shell command by interpolating environment values. Use argument arrays with shell execution disabled.

## Secret Handling

- Never print complete environment objects.
- Redact tokens, credentials, cookies, authorization headers, connection strings, and private keys from logs and errors.
- Avoid placing secrets in command-line arguments because process listings and diagnostics may expose them.
- Fail with the variable name and expected shape, not its value.
- Keep public browser configuration separate from server-only secrets; only intentionally public Next.js variables may enter client bundles.
