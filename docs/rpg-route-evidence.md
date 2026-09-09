# RPG v2 deterministic route evidence

The repository command `npm run rpg:verify-v2` replays the pure engine from an empty profile. It validates every accepted snapshot with the canonical v2 validator and fails immediately if a route cannot finish, a specialization changes, or an event pool lacks a normal-engine witness.

## Route matrix

The verifier completed 72 runs: three classes × two forge specializations × two fortress routes × seeds 0–5. Every named route reached `dawn` without permanent upgrades. Parley routes contain 28 authored decisions and dream routes contain 32; all exceed the required 12. Seeds 0–5 collectively covered `black-rain`, `blood-moon`, and `still-star`.

The 12 route names are:

- `warrior-direct-parley`, `warrior-direct-dream`, `warrior-prepared-parley`, `warrior-prepared-dream`
- `mage-direct-parley`, `mage-direct-dream`, `mage-prepared-parley`, `mage-prepared-dream`
- `ranger-direct-parley`, `ranger-direct-dream`, `ranger-prepared-parley`, `ranger-prepared-dream`

The versioned decisions and four delayed consequences for each route live in `test/rpg/routeMatrix.ts`; the command prints them with the run result.

## Event seed witnesses

These are the first witnesses found while scanning seeds 0–255. The wilds prefix is `listen → supplies → bridge → leave → staff`. The fortress prefix uses the direct specialization, dream route, siege route, ranger sneak, and refuge focus choices. Each event selection is made by the regular engine transition, consumes exactly one serialized PRNG draw, and stores the selected `nodeId` in the resulting snapshot.

| Pool | Event | Seed |
|---|---|---:|
| wilds | `wild-moonwell` | 0 |
| wilds | `wild-grave-cart` | 1 |
| wilds | `wild-white-stag` | 3 |
| wilds | `wild-reed-oracle` | 4 |
| wilds | `wild-herbalists-cache` | 5 |
| wilds | `wild-ash-birds` | 6 |
| wilds | `wild-root-court` | 7 |
| wilds | `wild-witchfire` | 8 |
| fortress | `fortress-mirror` | 0 |
| fortress | `fortress-scriptorium` | 1 |
| fortress | `fortress-folded-hall` | 4 |
| fortress | `fortress-clock-room` | 5 |
| fortress | `fortress-mouth-door` | 10 |
| fortress | `fortress-candle-child` | 14 |
| fortress | `fortress-sleepwalker` | 16 |
| fortress | `fortress-armory` | 24 |

`test/rpg/engine.test.ts` additionally checks deterministic replay of these selections, exactly one event from each pool per route, all four fortress loot outcomes, exhausted unique-loot fallback, and uninterrupted versus serialized reload outcomes.
