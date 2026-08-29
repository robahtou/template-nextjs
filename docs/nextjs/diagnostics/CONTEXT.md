# Next.js Diagnostics Context

## Purpose

Diagnostics preserve reproducible evidence for unresolved or costly Next.js behavior across development, type generation, production builds, runtime rendering, caching, Turbopack, and React Compiler. They are investigation records, not a generic changelog or a collection of guesses.

Follow the parent [Next.js conventions](../CONTEXT.md). Promote durable conclusions to [Next.js lessons](../lessons/CONTEXT.md).

## Current records

- [2026-08-28 template baseline](2026-08-28-template-baseline/CONTEXT.md): frozen runtime/framework selection and verification contract.

## When to create a record

Create a record when an issue is reproducible, crosses framework boundaries, has competing hypotheses, or is likely to recur. Fix isolated application mistakes directly unless the investigation teaches a reusable framework constraint.

Store each investigation at `docs/nextjs/diagnostics/<YYYY-MM-DD>-<short-slug>/CONTEXT.md`. Use the date on which evidence collection began. Do not create an empty record directory.

## Required recording schema

Every diagnostic record contains these sections:

1. **Summary:** one observable symptom, current status (`open`, `mitigated`, `resolved`, or `not-reproducible`), impact, first-seen date, and investigator.
2. **Affected baseline:** execution mode (`dev`, `typegen`, `build`, or `start`), route or module, relevant operating system/runtime facts, and links to the exact `package.json` and `next.config.ts` state. A dated diagnostic may quote exact versions when version identity is evidence.
3. **Trigger and minimal reproduction:** smallest deterministic setup, numbered commands or interactions, required initial state, frequency, and whether a fresh process or cleared generated output changes the result.
4. **Expected and observed behavior:** separately stated outcomes. Include the complete primary error, status code, visible state, or compiler diagnostic needed to identify the failure.
5. **Evidence:** timestamped logs, stack frames, network or build facts, screenshots, profiles, and source locations. Distinguish captured facts from interpretation and redact sensitive values.
6. **Hypotheses:** ordered candidate causes. For each candidate, state the observation that would support it and the observation that would rule it out.
7. **Experiments:** one changed variable per experiment, the exact command or interaction, observed result, and resulting conclusion. Preserve failed experiments when they eliminate a plausible cause.
8. **Root cause and confidence:** `confirmed`, `probable`, or `unknown`, followed by the evidence that justifies that confidence. Do not label temporal correlation as a confirmed cause.
9. **Resolution and recovery:** final change or mitigation, user impact during recovery, rollback path, and any cache/process restart required. Link the owning source or configuration change.
10. **Regression protection:** automated check, fixture, build assertion, or bounded manual reproduction that would catch recurrence.
11. **Related records:** linked lessons, upstream documentation or issue, route record, and prior diagnostics. State why each link is relevant.

## Investigation discipline

- Reproduce in both `pnpm dev` and `pnpm build`/`pnpm build:start` when the symptom may differ between development and production.
- Start with the smallest route or module and preserve the failing state before applying a fix.
- Change one variable at a time and record negative results.
- Check server output, browser output, generated types, and network behavior only as relevant; do not collect data without a hypothesis.
- Never paste credentials, cookies, authorization headers, private payloads, customer data, or unredacted environment values.
- Avoid destructive cache clearing as a first step. If cleanup changes the outcome, identify which generated state mattered.

## Closure

Resolve a record only when the trigger no longer reproduces, the proposed cause explains the evidence, production-mode behavior is checked when relevant, and regression protection exists or a documented reason explains why it cannot. If evidence remains insufficient, use `not-reproducible` or retain `unknown` confidence instead of inventing a root cause.

When a conclusion remains useful after the incident details are removed, create or update one lesson using the [lesson schema](../lessons/CONTEXT.md) and link both records.
