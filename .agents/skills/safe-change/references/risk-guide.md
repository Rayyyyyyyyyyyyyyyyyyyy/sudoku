# Safe Change Risk Guide

Read only the sections relevant to the current change. Prefer repository-specific evidence over generic defaults.

## Dependencies and package management

Signals:

- adding or replacing a package;
- running an installer or changing a lockfile;
- introducing a second library for an existing capability;
- changing package-manager commands or workspace configuration.

Expected response:

- detect the package manager from repository evidence and use it consistently;
- search installed dependencies and platform capabilities before adding one;
- check maintenance, runtime, bundle, license, and security implications in proportion to the dependency's role;
- keep lockfile and manifest changes together;
- avoid broad upgrades unless requested or required for compatibility or security.

Surface the decision when the dependency adds material infrastructure, cost, licensing, privileged access, or migration burden.

## Secrets and sensitive data

Signals:

- API keys, OAuth secrets, signing keys, service credentials, tokens, cookies, private endpoints, or personal data;
- new environment variables or configuration files;
- logging, analytics, debugging output, fixtures, or error reporting that may capture private values.

Expected response:

- keep privileged values on a trusted server boundary;
- use the repository's environment-loading and secret-management convention;
- commit examples with placeholders, never live values;
- prevent secrets and sensitive payloads from appearing in logs, errors, URLs, client bundles, or snapshots;
- distinguish public configuration from privileged credentials instead of hiding every value indiscriminately.

If a value may already have been exposed, do not repeat it. State that rotation or incident handling may be required.

## Client, server, authentication, and authorization

Signals:

- login, logout, sessions, OAuth callbacks, account recovery, roles, permissions, admin functions, ownership checks, or protected data;
- logic enforced only by hiding UI;
- client-provided user IDs, roles, prices, entitlements, or resource ownership.

Expected response:

- treat browser and client input as attacker-controlled;
- authenticate identity at the trusted boundary;
- authorize the specific action and resource independently of UI visibility;
- preserve session, cookie, CSRF, redirect, and callback conventions already established by the project;
- avoid inventing product permissions when semantics are ambiguous.

Surface decisions that weaken enforcement, change account semantics, alter trusted redirects, or require new identity-provider configuration.

## Persistent data and schema changes

Signals:

- database migrations, storage formats, destructive updates, backfills, renames, type changes, uniqueness constraints, or deletion behavior;
- code that must run across old and new schema versions;
- production records that cannot be recreated.

Expected response:

- inspect the migration framework and deployment model;
- determine whether the change is additive, compatible, destructive, or irreversible;
- prefer expand-migrate-contract sequencing when old and new application versions may overlap;
- preserve existing data and define validation for backfills;
- make rollback limits explicit rather than promising reversibility that does not exist;
- never execute a production mutation merely because writing the migration was requested.

Ask before destructive changes, irreversible transformations, uncertain deletion semantics, or operations requiring downtime or restoration decisions.

## Runtime and environment assumptions

Signals:

- hardcoded hosts, ports, paths, regions, time zones, credentials, feature flags, or development fallbacks;
- differences between local, preview, test, and production environments;
- new background jobs, queues, storage services, scheduled work, or external callbacks.

Expected response:

- use established configuration boundaries and validated defaults;
- fail clearly when required production configuration is absent;
- avoid silently falling back to localhost or insecure development behavior;
- account for deployment topology when code depends on process memory, local files, or long-running work;
- surface new infrastructure, cost, monitoring, or operational ownership.

## Destructive actions and rollback

Signals:

- deletion, overwrite, force operations, cleanup scripts, history rewriting, broad file movement, or replacing a subsystem;
- a change whose failure can leave data or the repository partially migrated.

Expected response:

- resolve exact targets before acting;
- prefer reversible and scoped operations;
- separate preparation, validation, mutation, and cleanup when partial failure matters;
- preserve recovery artifacts when appropriate;
- define a stopping condition for retries;
- require explicit direction when the destructive effect or target is not already clear from the request.

## Verification and honest completion

Choose checks from repository evidence and change risk:

- focused tests for the changed behavior;
- typecheck, lint, build, and package validation;
- authorization and negative-path checks;
- migration validation against representative existing data;
- confirmation that secrets and environment-specific values are absent from the diff;
- focused runtime checks for callbacks, configuration, or deployment assumptions.

Do not claim a check passed when it was not run. Distinguish implementation completion from production rollout, migration execution, secret provisioning, or external-service configuration.
