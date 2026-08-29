---
name: greenfield
description: Applies this template's greenfield compatibility stance. Use when designing, implementing, or reviewing changes that might preserve obsolete behavior.
---

# Greenfield

This template has no production users, production data, deployed compatibility contract, or external consumers.

- Replace obsolete APIs, routes, data shapes, configuration, and file structures directly.
- Update every in-repository caller in the same change and delete the superseded path.
- Do not add migrations, deprecation periods, aliases, compatibility wrappers, or version-suffixed replacements for hypothetical consumers.
- Preserve explicit user-owned configuration and unrelated worktree changes; greenfield status does not expand the requested scope.
- Keep changes type-safe, secure, accessible, and proportionately verified.
- If a downstream adopter has introduced real users, data, or external consumers, follow that project's documented compatibility contract instead of this template assumption.

Prefer the simplest correct current design over preserving a legacy shape that the template does not need.
