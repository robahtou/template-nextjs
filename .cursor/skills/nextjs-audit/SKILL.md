---
name: nextjs-audit
description: Performs a read-only, evidence-based audit of this Next.js application. Use when reviewing App Router, caching, compiler, security, accessibility, or framework correctness without implementing fixes.
---
# Audit Next.js

Perform a read-only Next.js audit for the requested scope, or the whole application when no scope is provided.

1. Read `package.json`, `next.config.ts`, `tsconfig.json`, `README.md`, and relevant `CONTEXT.md` files.
2. Check App Router conventions, async request APIs, Server/Client boundaries, Cache Components, invalidation, metadata, images, and route error/loading states.
3. Check React Compiler compatibility and Turbopack-specific assumptions.
4. Review mutations and Route Handlers for validation, authorization, secret handling, and safe failures.
5. Review interactive UI for semantic HTML, keyboard/touch parity, focus, names, and resizing.
6. Run non-mutating checks when useful; do not run formatters.
7. Report findings by severity with evidence, impact, and a concrete remediation. State when no finding is confirmed.

Do not edit files unless the user separately asks for fixes.
