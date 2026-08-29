---
name: provide-five-part-implementation-plan
description: Produces a concise, evidence-based five-part implementation plan for this greenfield Next.js template without editing files. Use when the user requests a five-part plan covering the outcome, current evidence, design contracts, change sequence, and validation.
---
# Provide a Five-Part Implementation Plan

Plan only. Do not edit files, run mutating commands, or present proposed work as completed.

## Investigate First

- Capture the requested outcome, scope, and explicit non-goals. Ask a question only when a missing decision would materially change the design and repository evidence cannot resolve it.
- Read `README.md`, the nearest `CONTEXT.md` for each affected boundary, affected implementation and tests, and authoritative manifests or configuration. For framework-sensitive work, consult the pinned Next.js guidance in `node_modules/next/dist/docs/`.
- Trace the end-to-end causal flow through authoritative owners, callers, consumers, generated artifacts, and relevant runtime state. Find nearby repository precedents without assuming their constraints apply unchanged.
- Classify material findings as verified source, test, documentation, or runtime evidence; inference; assumption; or unresolved. For exhaustive claims, name the authoritative manifest or bounded read-only search that establishes them. Add a pre-implementation drift gate when the plan depends on mutable repository, generated, installed-framework, or deployed state.
- Identify live, dormant, historical, and protected surfaces and the files or symbols to create, modify, delete, generate, inspect only, or preserve. Preserve unrelated worktree changes.
- Apply the greenfield stance: replace obsolete behavior, update every in-repository caller, and delete the superseded path instead of adding shims or migrations for hypothetical consumers. Preserve explicit user-owned configuration, and follow a documented compatibility contract if evidence establishes real users, data, deployments, or external consumers.
- Never imply that a check ran unless it actually ran.

Then produce exactly these five top-level sections:

## 1. Problem and Outcome

State the selected decision and define success through observable user and system behavior. Include constraints, in-scope and out-of-scope work, preserved behavior, non-goals, and binary acceptance criteria. Use a compact scenario matrix when behavior varies by state or input.

## 2. Current State

Explain the causal flow with repository-relative file and symbol references. Identify authoritative contracts and owners, current callers and consumers, relevant repository precedents, dependency and generation boundaries, confirmed gaps, protected unchanged surfaces, and any unresolved or drift-sensitive premise. Keep verified evidence distinct from inference and assumptions.

## 3. Design

Describe the chosen approach, target flow, final ownership boundaries, and material alternatives or trade-offs. State numbered contracts or invariants when they constrain implementation, including negative guarantees and relevant failure, cleanup, concurrency, retry, idempotency, stale-state, security, caching, accessibility, and documentation behavior. Explain the greenfield cutover, artifact disposition, and any real compatibility or rollout boundary.

## 4. Implementation Steps

Start with a concise change ledger using `Create`, `Modify`, `Delete`, `Generated via`, `Inspect only`, and `Preserve/protected` as applicable. Then give a numbered, dependency-ordered sequence. Each step names exact paths or symbols, states what changes and why, and includes affected callers, generated artifacts, superseded-file removal, proportional regression coverage, and durable `CONTEXT.md` updates when a contract changes.

For multi-owner or cross-package work, identify prerequisites, changes that must land atomically, source or shared-file serialization, generation and verification order, and each phase's observable exit gate or handoff. Split subordinate plans only when independent authorization or hard dependency boundaries justify it.

## 5. Validation and Risks

Map every material acceptance criterion or invariant to a proof mechanism. List verified repository commands in escalating order with prerequisites and expected outcomes, followed by positive and negative runtime acceptance scenarios and final `pnpm verify`. Mark checks as automated, manual, conditional, or unavailable when that distinction matters.

Pair concrete risks with mitigations and include blocking or stop conditions, meaningful rollback constraints, residual risks, and explicitly deferred or unverified work. When validation creates external state, child processes, secrets, or retained artifacts, name ownership, bounded cleanup, authoritative readback, and safe evidence requirements.

Keep the result concise, prospective, canonical, and implementation-ready. State each fact or invariant once. Do not append implementation status, timestamps, commit histories, amendment journals, or raw verification results; prescribe a separate completion record when later execution evidence is warranted. Avoid volatile counts or hashes unless a maintained contract owns them. Use tables only for compact state, change, dependency, or verification matrices, and use short code blocks only when an exact API shape or copy-pasteable validation command removes ambiguity. Do not introduce speculative architecture or optional dependencies.
