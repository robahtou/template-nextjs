# Repository Policy Checks Context

## Ownership

This folder owns deterministic checks for canonical documentation and frozen dependency contracts. These scripts use only Node.js built-ins, derive the repository root from their own location, and do not require Git metadata.

## Checks

- `context-md-prose-unwrap.mjs` visits only `CONTEXT.md` files below `docs`, `src`, `scripts/lint`, and `tooling/code-style`, with explicit generated, dependency, protocol, planning, and fixture exclusions. It requires exactly one of `--check` or `--fix` and preserves fenced code and Markdown structure while joining safely wrapped prose.
- `dependency-baseline.mjs` verifies the frozen Node.js and pnpm metadata, framework and compiler manifest values, installed package metadata, workspace release-age exclusions, lockfile importers/packages, native root TypeScript, and the private TypeScript 6 compiler-API bridge.
- `guidance.mjs` checks the explicit canonical roots without Git, enforces the exact regular-file manifest below `.agents` and `.cursor`, rejects unexpected files and symbolic links in those trees, requires matching skill names and byte-identical shared skill instructions and resources across both environments, validates skill entrypoint names and descriptions, requires the target context hierarchy and tracked framework-managed root agent-rules block, rejects known legacy guidance sources, validates local Markdown links and backticked pnpm commands, and rejects only the exact placeholder identities defined by its small denylist.

Checks report every deterministic finding in one run and never mutate files. The prose formatter writes only in fix mode. Fixture directories are excluded from production scans so negative test cases cannot lint themselves.

## Maintenance

Keep manifest, workspace, installed-package, and lockfile checks synchronized as one dependency-baseline change. Add denylist entries only for exact recorded product identities; generic technologies, domains, and ordinary vocabulary are not prohibited.

Add or remove a repository skill in `.agents/skills` and `.cursor/skills` together. Keep `SKILL.md` and shared references, scripts, and assets byte-identical. Keep Codex-specific `agents/openai.yaml` metadata only in `.agents`; Cursor-specific rules, commands, and hooks may remain host-specific when the durable policy they apply is owned by shared documentation or executable checks.

Formatter implementation details live in the [`tooling/code-style` context](../../tooling/code-style/CONTEXT.md). Run `pnpm test:guidance` after changing these contracts and `pnpm lint:guidance` after changing canonical guidance.
