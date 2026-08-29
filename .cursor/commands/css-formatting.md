# Format CSS

Format the CSS files named in `$ARGUMENTS`, or the changed CSS files when no paths are supplied.

1. Read `.cursor/rules/css/css.mdc`, `.cursor/rules/styling-architecture.mdc`, and the nearest `CONTEXT.md`.
2. Preserve CSS Module and global cascade-layer ownership; do not redesign selectors or tokens as part of formatting.
3. For a focused edit, run `pnpm fmt:file --file <path>` for each file.
4. For an intentional CSS-wide pass, run `pnpm fmt:css`.
5. Review the diff for semantic changes, then run `pnpm lint:css`.
6. Report the files formatted and the validation result.

Do not add a formatter dependency or modify unrelated files.
