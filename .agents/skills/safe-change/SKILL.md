---
name: safe-change
description: Guard application changes against hidden engineering risks involving dependencies, secrets, client/server trust, authentication, authorization, persistent data, schema changes, runtime assumptions, destructive operations, or rollback. Use when implementing or refactoring code that touches those areas; do not use for ordinary presentation-only edits.
---

# Safe Change

Make the smallest safe change while shielding the user from routine engineering ceremony and surfacing decisions that carry real security, data-loss, compatibility, cost, or product risk.

## Establish the safety context

- Follow the user's request and repository instructions before this skill's preferences.
- Inspect the repository's package manager, lockfile, runtime, environment conventions, client/server boundary, authentication and authorization approach, persistence layer, migration tooling, and relevant checks.
- Preserve established safe conventions unless the task requires changing them.
- Do not broaden a focused request into a security rewrite, dependency migration, or infrastructure project.

## Decide quietly or surface the risk

Handle routine, reversible engineering decisions silently when repository evidence provides a safe answer.

Surface the concrete impact before proceeding when a decision could cause:

- secret or private-data exposure;
- destructive or difficult-to-reverse data changes;
- weakened authentication or authorization;
- breaking compatibility or a required migration;
- new infrastructure, recurring cost, or operational ownership;
- ambiguous product semantics with security or data consequences.

Explain the user-visible risk and available choice, not the name of an engineering pattern. Never treat ambiguity as permission for a destructive or security-sensitive action.

## Core guardrails

- Use the repository's existing package manager and lockfile. Add a dependency only when current code, the platform, and installed packages do not reasonably solve the problem.
- Keep secrets and privileged credentials out of client bundles, source control, logs, fixtures, screenshots, and user-visible errors. Follow established environment-variable conventions with safe placeholders.
- Treat client input and UI state as untrusted. Enforce sensitive rules at the trusted server or data boundary; authentication does not replace authorization.
- Preserve data by default. For schema or persistence changes, understand compatibility, migration order, rollback limits, and the effect on existing records before mutation.
- Do not hardcode local hosts, machine-specific paths, development-only credentials, or environment assumptions into production behavior.
- Prefer scoped, reversible changes. Avoid large rewrites, destructive cleanup, or dependency churn for a small request.

For detailed signals and expected responses, read [references/risk-guide.md](references/risk-guide.md) when the task touches dependencies, secrets, auth, persistence, schema changes, runtime configuration, or destructive behavior.

## Before finishing

Check that:

- no secret, privileged operation, or sensitive data crossed into an untrusted boundary;
- authentication and authorization are enforced at the appropriate trusted layer;
- dependency and package-manager choices follow repository conventions;
- persistent-data changes have a compatible execution order and proportionate recovery plan;
- development assumptions do not leak into production behavior;
- relevant build, typecheck, lint, tests, and focused runtime checks were run when available;
- the final diff contains no accidental destructive or high-risk scope expansion.

Keep routine safeguards out of the handoff. Report only material risk decisions, unresolved limitations, required migrations, recovery constraints, or checks that could not be completed.
