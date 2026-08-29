# Record a Next.js Lesson

Record the confirmed lesson described in `$ARGUMENTS`.

1. Verify the behavior against the pinned framework version, live configuration, and reproducible evidence.
2. Search `docs/nextjs/diagnostics` and `docs/nextjs/lessons` to avoid duplicating an existing record.
3. Update the appropriate `CONTEXT.md` with the symptom, impact, affected versions/configuration, minimal reproduction, evidence, root cause, resolution, and verification.
4. Separate discarded hypotheses from the confirmed cause.
5. Add official documentation and repository-relative links where useful.
6. State when the lesson should be revisited or removed.
7. Run `pnpm lint:context-md` and `pnpm lint:guidance`.

Do not record secrets, raw incident logs, product-specific data, or an unverified workaround as durable guidance.
