## Decisions

### Saved state remains authoritative

An accepted idiom snapshot owns its serialized puzzle. Restoration must initialize gameplay from that puzzle and derive `solved` from its fills; current corpus or generator output must not replace it. Sudoku continuation reconstructs its route from the saved `level`, `seed`, and `isDaily` identity because Sudoku intentionally stores only player input while the versioned offline puzzle bank remains authoritative.

### Deterministic random primitives are shared infrastructure

The existing xorshift32 implementation moves out of the poker namespace to a neutral module. Poker keeps a compatibility re-export so current callers and serialized PRNG state remain valid, and byte-for-byte output must not change.

### Offline means installed-after-first-visit

The built application will register a same-origin service worker that pre-caches the production HTML, hashed bundles, generated data, and local static assets. Navigation falls back to cached application HTML; immutable build assets are served cache-first. Cache names are build-specific and old application caches are removed on activation. Development mode does not register the worker.

Remote Google Font requests are removed; system/local font fallbacks keep rendering usable without network access. This does not claim that a never-visited remote URL can open offline.

### Compatibility and recovery

No localStorage key or snapshot schema changes. Existing poker random sequences, idiom seeds, Sudoku URLs, and records must remain compatible. A service-worker update must activate without deleting non-application caches or any localStorage data.

## Acceptance Evidence

- A restored idiom save continues on the stored puzzle even when generation for the same route is made to differ.
- A saved Sudoku session can be resumed from visible UI and routes to its exact daily or seeded identity.
- Seeded random regression vectors for poker and idiom remain unchanged after extraction.
- A production build emits a service worker whose precache contains the built shell/assets, has navigation fallback, and makes no third-party font request.
- Focused tests, complete engine/UI suites, production build, and diff checks pass.
