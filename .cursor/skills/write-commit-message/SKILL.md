---
name: write-commit-message
description: Create a Conventional Commits-style message and an explicit staging command from the current working-tree changes. Use only when the user explicitly invokes this skill or asks for this repository's commit-message workflow.
---

# Write Commit Message

## Overview

Create a **Conventional Commits**-style message for the **current code changes** from git diff, along with the corresponding explicit `git add` command.

Optimize for:
- **Clarity**: easy to understand quickly.
- **High-level impact**: what changed and why, not a diff rehash.
- **Actionable output**: commit message plus ready-to-run staging command.

Use these references only as background:
- https://www.conventionalcommits.org/en/v1.0.0
- https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13

## Inputs

- Prefer staged changes from `git diff --cached`; if empty, use `git diff`.
- Run `git status --short` to include untracked, deleted, and renamed files in the staging suggestion.
- Run `git log --oneline --no-decorate -n 10` for recent style and duplicate-intent checks.
- Treat changed `CONTEXT.md` files as versioned developer documentation and include them in staging like any other relevant file.
- Follow the repository rule for local scratch files by excluding `_implementation_plans/` and `_next_six_months/` paths.
- Exclude `zComMsg.md` from the generated `git add` command unless the user explicitly asks to stage it.
- Use any short description the user provides as intent context.

If you cannot inspect the diff directly, ask the user to paste the relevant diff or confirm the changed files.

## Process

1. **Inspect recent history**
   - Use recent commit subjects only to match style and avoid duplicate or near-duplicate commit intent.
   - Derive changed files from the current diff/status, not from history.

2. **Inspect the changes**
   - Identify the main behavior, docs, tooling, test, or refactor impact.
   - Note breaking changes, public API changes, migrations, or user-facing effects.

3. **Choose type and scope**
   - Use one primary type: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`, `build`, `perf`, or `style`.
   - Choose a concise scope from the dominant package, app, feature, or subsystem.
   - If changes span several areas, pick the dominant scope and keep the summary high-level.

4. **Write the summary**
   - Use `<type>(<scope>): <summary>`.
   - Use imperative mood, present tense, no trailing period.
   - Keep it near 72 characters where practical.
   - Emphasize the incremental delta if recent commits covered related work.

5. **Write an optional body**
   - Use 2-5 short bullets or sentences when the change needs context.
   - Explain what changed and why; avoid line-by-line diff narration.
   - Add `BREAKING CHANGE: ...`, `Refs: ...`, or `Closes: ...` footers when applicable.

6. **Build the `git add` command**
   - Emit explicit paths only; do not use `git add .`.
   - Exclude untracked ignored paths. If unsure, verify with `git check-ignore -q <path>`.
   - Quote paths with shell metacharacters or whitespace.
   - For deletions, use explicit `git add -u <path>` or a narrowly scoped `git add -A <dir>`.

## Output

1. Write only the commit message to `zComMsg.md` at the project root, replacing the entire file.
2. Print the commit message in chat.
3. Print the generated `git add` command separately.
4. Briefly state any important assumption if the type, scope, or staging list is ambiguous.
5. Never add authorship, co-authorship, AI-assistance, tool-credit, or agent-attribution text anywhere in the commit message. This includes `Co-authored-by: Cursor <cursoragent@cursor.com>` and every casing, spelling, or semantic variant of `Co-authored-by`, `Authored-by`, `Author-by`, `Generated-by`, `Assisted-by`, or similar attribution.
6. Before writing or printing the message, inspect the complete subject, body, and footers and remove any prohibited attribution.
