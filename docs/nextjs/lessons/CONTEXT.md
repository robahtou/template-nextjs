# Next.js Lessons Context

## Purpose

Lessons record verified, reusable framework conclusions that should influence future implementation or review. They contain the smallest durable rule and its evidence, not incident chronology, copied release notes, preferences, or speculative advice.

Use the parent [Next.js context](../CONTEXT.md) for baseline conventions and [diagnostics](../diagnostics/CONTEXT.md) for active investigation evidence.

## When to record a lesson

Record a lesson only when all of these are true:

1. The behavior was reproduced or verified against authoritative framework behavior.
2. The conclusion applies beyond one accidental code defect.
3. Following the conclusion changes implementation, review, or debugging decisions.
4. Its applicable configuration and invalidation conditions can be stated precisely.

Store each topic at `docs/nextjs/lessons/<topic-slug>/CONTEXT.md`. Merge overlapping findings into one topic owner instead of creating chronological duplicates.

## Required recording schema

Every lesson contains these sections:

1. **Rule:** one imperative statement that can guide a code review.
2. **Applies when:** relevant App Router surface, execution mode, enabled feature flags, and version range or baseline source. Prefer links to `package.json` and `next.config.ts`; quote exact versions only when the boundary itself depends on them.
3. **Problem signature:** the observable symptom or recurring mistake that makes the lesson relevant.
4. **Mechanism:** the verified framework behavior that connects the mistake to the symptom.
5. **Preferred pattern:** a minimal project-specific example or precise implementation sequence, including server/client and cache boundaries.
6. **Rejected alternatives:** plausible approaches that were tested or reviewed, why they fail, and any case in which they would become valid.
7. **Evidence:** links to a diagnostic record, official source, focused fixture, generated output, or reproducible command. Evidence must support the mechanism rather than merely repeat the rule.
8. **Verification:** the exact check that confirms compliance and the failure signal that would expose a regression.
9. **Safety impact:** security, privacy, cache isolation, error disclosure, and accessibility consequences, or an explicit statement that none apply.
10. **Revisit triggers:** framework/configuration changes, upstream fixes, removed flags, or architecture changes that invalidate the lesson.
11. **Ownership:** owning source area, last-verified date, and reviewer or team role responsible for revalidation.

## Promotion from diagnostics

When closing a diagnostic, remove reproduction noise from the promoted lesson. Preserve only the confirmed mechanism, constraints, preferred pattern, counterexamples, evidence link, and regression check. Link the lesson back to the diagnostic so failed experiments remain discoverable without bloating the rule.

## Maintenance

- Keep lessons aligned with the live package and configuration sources.
- Re-run the stated verification when a revisit trigger occurs.
- Update the canonical topic directly when behavior changes; this greenfield template does not retain stale advice as a compatibility branch.
- Delete a lesson that no longer guides a current decision after its historical evidence remains captured in diagnostics or version control.
- Promote a broadly applicable source-placement, security, or route rule to the owning context and leave only framework-specific mechanics here.

Run `pnpm lint:guidance` after adding a lesson and `pnpm verify` when the lesson changes executable expectations.
