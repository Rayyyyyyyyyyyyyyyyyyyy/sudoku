## ADDED Requirements

### Requirement: Canonical active-run restoration
The application SHALL treat persisted poker run data as untrusted and SHALL restore it only after versions, catalog references, progression bounds, card zones, selections, inventory, economy, timers, guards, and phase-specific payloads have been validated and normalized into a canonical run model.

#### Scenario: Restore a valid run from any stable phase
- **WHEN** a schema-compatible snapshot produced after a committed transition is loaded
- **THEN** the application restores the same authoritative gameplay state, deterministic random state, progression, inventory, economy, and phase

#### Scenario: Reject an impossible progression cursor
- **WHEN** a snapshot names a known opponent but its stage or round index does not resolve to a configured round
- **THEN** the snapshot is classified as incompatible before any game component dereferences the current round

#### Scenario: Reject inconsistent phase data
- **WHEN** a shop, pack, or resolving snapshot lacks its required payload or contains an illegal phase transition target
- **THEN** the snapshot is classified as incompatible and is not passed to the reducer or React game screen

#### Scenario: Reject invalid catalog and identity references
- **WHEN** a snapshot contains unknown or duplicate modifier, offer, choice, transaction, selection, or card identities
- **THEN** the application rejects the snapshot without granting an item or advancing gameplay

### Requirement: Recoverable incompatible-save handling
The application SHALL convert parsing, validation, version, and normalization failures into a recoverable incompatible-save result while preserving separately stored poker records.

#### Scenario: Open a malformed active run
- **WHEN** persisted active-run JSON is malformed or fails any canonical-state invariant
- **THEN** the player is routed to the poker recovery experience, receives an explanation that the run cannot be resumed, and may clear only the active run

#### Scenario: Preserve records during recovery
- **WHEN** an incompatible active run is detected or cleared
- **THEN** runs started, runs won, highest completed score, win streak, and record idempotency guards remain unchanged

#### Scenario: Storage is unavailable
- **WHEN** browser storage cannot be read or written
- **THEN** storage failure does not crash active gameplay and the application falls back to its existing empty or in-memory behavior

### Requirement: Canonical poker records
The application SHALL expose poker records through a canonical model containing only supported nonnegative counters and unique string run identifiers, using safe defaults for missing or invalid persisted fields.

#### Scenario: Load partially invalid records
- **WHEN** the records key contains an object with missing fields, invalid counter values, duplicate identifiers, or unsupported properties
- **THEN** the loader preserves valid supported values, normalizes identifiers, fills invalid fields from the empty-record defaults, and does not expose unsupported properties to React

#### Scenario: Record a completion after normalization
- **WHEN** a terminal run is recorded after persisted records have been normalized
- **THEN** completion counters and identifiers are updated exactly once using the canonical record model

### Requirement: Derived shop pricing
The effective price of every shop offer SHALL be derived from the versioned item catalog and current shop progression, and persisted offer data SHALL NOT override that price.

#### Scenario: Load a legacy schema-v1 offer price
- **WHEN** an otherwise valid schema-v1 shop or pack snapshot contains the previously persisted derived `cost` field
- **THEN** the application ignores and removes that field while preserving the offer identity, purchase state, random state, and effective catalog-derived price

#### Scenario: Continue after normalized shop recovery
- **WHEN** a legacy shop snapshot is normalized and resumed
- **THEN** purchase availability and coin deduction use the same shared pricing rule as a newly generated shop at the same progression

### Requirement: Rendered recovery and interaction verification
Critical poker behavior that depends on React rendering, routing, effects, focus, or browser preferences SHALL be covered by mounted integration tests in addition to deterministic engine tests.

#### Scenario: Verify recovery through the rendered route
- **WHEN** a mounted poker route starts with an empty, malformed, or incompatible active-run save
- **THEN** tests verify the rendered redirect or recovery state and the record-preservation behavior

#### Scenario: Verify committed play presentation
- **WHEN** a mounted game selects cards, commits a play, and finishes or skips score presentation
- **THEN** tests verify action availability, phase progression, accessible status text, and intended focus behavior

#### Scenario: Verify browser preference behavior
- **WHEN** reduced motion is reported through the browser media-query boundary
- **THEN** mounted tests verify that resolution remains understandable and completes without the full sequential animation
