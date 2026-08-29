# Next.js Playbook

Use this workflow for the change described in `$ARGUMENTS`.

1. Read `README.md`, `docs/nextjs/CONTEXT.md`, the nearest source `CONTEXT.md`, manifests, and live Next.js configuration.
2. Classify affected routes and place code at the narrowest durable ownership boundary.
3. Keep initial reads server-first and Client Components small.
4. Define cache behavior explicitly: request-time, cached with a documented lifetime, or invalidated after mutation.
5. Use Server Actions for UI mutations and Route Handlers for genuine HTTP consumers; validate input and authorize on the server.
6. Preserve React Compiler-compatible rendering and diagnose Turbopack or Cache Components issues with evidence.
7. Meet accessibility acceptance criteria and use project CSS Modules and shared tokens.
8. Update `CONTEXT.md` only for durable behavior or ownership changes.
9. Run focused checks, then `pnpm typecheck` and `pnpm build` for framework-sensitive work.

Follow the greenfield stance: replace obsolete patterns directly and avoid speculative compatibility layers.
