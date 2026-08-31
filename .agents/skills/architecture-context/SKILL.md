---
name: architecture-context
description: Preserve repository-resident architectural intent across agents, models, sessions, and human collaborators. Use when entering a non-trivial existing scope, changing ownership, dependencies, public APIs, state, external boundaries, or architecture documentation; do not use for trivial edits or source-code narration.
---

# Architecture Context

Make the repository a durable handoff artifact so a future agent can recover why important boundaries exist without relying on conversation history or model memory.

## Recover context

- Follow the user's request and repository instructions before this skill's guidance.
- Locate the repository's established architecture-documentation convention. Use `ARCHITECTURE.md` only when no equivalent convention exists.
- Before non-trivial work, read the relevant hierarchy from repository scope to the nearest feature or module, then inspect code, types, schemas, tests, and callers.
- Treat documentation as intended design and implementation as current reality. When they conflict, determine which side is stale from repository evidence instead of blindly trusting either one.
- Preserve documented responsibilities, state ownership, public boundaries, dependency rules, external boundaries, and invariants unless the task concretely requires changing them.

Recover this context silently. Surface a conflict only when resolving it requires a material product decision, destructive migration, or scope expansion.

## Preserve intent

- When a material change alters architectural intent, update the nearest existing architecture document in the same change.
- Create a new architecture document only for durable, non-obvious knowledge that future agents could reasonably misunderstand and that has no established home.
- Keep documentation at meaningful architectural scopes, not per directory or per file.
- Record responsibilities, allowed dependencies, ownership, public boundaries, invariants, external boundaries, non-goals, or intentionally rejected alternatives only when they change future decisions.
- Do not restate types, exports, prop lists, filenames, or behavior already obvious from code and tests.
- Write architecture context in plain, model-neutral Markdown. Do not depend on a specific agent, tool name, or conversation.

For conflict resolution, document-creation criteria, and content guidance, read [references/architecture-context.md](references/architecture-context.md).

## Before finishing

Check that:

- relevant architectural intent was discovered before implementation;
- the change preserves documented boundaries or updates them intentionally;
- architecture-changing code and its nearest documentation agree;
- no architecture document was created for a trivial or self-evident change;
- a different agent could recover the important decision from the repository alone.

Keep routine context recovery out of the user-facing handoff. Mention architecture documentation only when it was materially changed or when an unresolved conflict needs a decision.
