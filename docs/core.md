# Core functions (`src/core/`)

Pure TypeScript with no React and no browser APIs. Every function here was written **test-first**; tests sit next to the code (`*.test.ts`).
Why keep it pure: it's the part that must be correct, it's the easiest part to test, and a future public API (V2) can reuse it unchanged.

Entries are added as each function is built. Each one says **what** it does, **why** it works that way, its edge cases, and which tests cover it.
