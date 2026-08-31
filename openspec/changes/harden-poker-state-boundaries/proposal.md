## Why

Poker saves currently receive only shallow structural validation, so a snapshot with a valid version but an impossible progression cursor or inconsistent phase payload can be accepted and later crash the React game screen. The repository also has drift between the implemented final-round product rule and its original OpenSpec requirement, while source-pattern UI tests cannot verify the recovery and interaction behavior players actually experience.

## What Changes

- Introduce a canonical poker snapshot parser that validates progression bounds, phase-specific payloads, catalog references, uniqueness, and cross-field invariants before state reaches React.
- Treat every malformed or incompatible active run as a recoverable state that preserves records and routes the player to the existing recovery experience.
- Validate and normalize persisted poker records instead of spreading arbitrary stored fields into the UI model.
- Remove persisted shop-offer prices as a second source of truth; derive prices from the versioned catalog and shop progression at use sites.
- Align the poker gameplay specification with the deliberate product adjustment that the primary stage-three special round has no additional card-selection restriction.
- Add rendered React integration coverage for save recovery, routing, core play resolution, shop/pack guards, focus, disabled states, and reduced-motion behavior while retaining the deterministic Node engine suite.

## Capabilities

### New Capabilities

- `poker-state-boundaries`: Defines canonical validation, normalization, and recoverable handling for persisted poker runs and records before they enter the application state boundary.

### Modified Capabilities

None. The repository has no synchronized main specs yet; the stale final-round statement remains in the completed `add-poker-roguelike` change and will be reconciled as part of this change before those completed changes are synchronized and archived.

## Impact

- Affected runtime modules: `src/lib/poker/persistence.js`, `src/lib/poker/economy.js`, `src/lib/poker/run.js`, and poker route/page consumers.
- Affected tests: poker persistence and run tests, plus a new rendered React integration test boundary.
- Planning impact: correct the completed poker delta spec and prepare completed changes for synchronization/archive without changing the current final-round gameplay.
- Development dependencies may add Vitest, jsdom, and React Testing Library; production dependencies and storage keys remain unchanged.
- No persistence schema bump is expected because validation is tightened and a derived offer field is removed without changing authoritative gameplay state.
