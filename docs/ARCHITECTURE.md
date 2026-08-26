# Client-Side Architecture

The Moderator Game is a fully client-side single-page application. There is no
backend server, no network calls, and no server-rendered state — every piece
of game logic that used to live in the Python/FastAPI backend has been ported
to TypeScript and now runs synchronously in the browser.

## Why fully client-side?

Running the simulation in the browser removes the need for a backend
deployment, database, or API surface. The whole game state lives in memory
for the duration of a browser tab session; reloading the page starts a fresh
simulation.

## Module layout

```
frontend/src/
  simulation/          # Domain layer — no React, no DOM
    rng.ts             # Deterministic PRNG (mulberry32)
    csvContent.ts      # CSV parsing for bundled post datasets
    categories.ts      # Category definitions (alpha/beta/gamma) + post pools
    data/*.csv          # Pre-authored post content, one file per category
    parameters.ts       # Default parameters + range clamping
    graph.ts            # Social graph model and evolution rules
    postSystem.ts        # Post lifecycle (creation, seen, reposted, censorship)
    gameLogic.ts          # Classification + win/loss evaluation
    engine.ts              # SimulationEngine orchestrator
  hooks/
    useSimulation.ts       # React hook bridging SimulationEngine <-> UI state
  components/               # Presentational React components (unchanged)
  config/categories.ts       # UI-facing category labels/colors
  types.ts                    # Shared UI/domain data contracts
```

The `simulation/` folder has zero React or DOM dependencies: it is a plain
TypeScript library that could be unit-tested or reused outside the UI.

## Data flow

1. `useSimulation()` creates a single `SimulationEngine` instance (via
   `useRef`) that persists for the lifetime of the component tree.
2. Every user action (`stepSimulation`, `censorPost`, `updateParameters`, ...)
   calls a synchronous method on the engine and copies the resulting snapshot
   into React state.
3. `SimulationEngine.step()` performs one full simulation tick:
   - generates new posts based on each node's opinion state,
   - propagates active posts to graph neighbors and marks them as seen,
   - rolls dice for reposts using a sigmoid-shaped probability curve,
   - evolves the social graph (adds convergent edges, removes discordant
     ones),
   - updates node opinion states and appends a time-series sample,
   - evaluates the win/loss/election outcome via `GameLogic.evaluate`.
4. `SimulationEngine.getSummary()` returns a `SnapshotResponse` — the same
   shape the old REST API used to return — so the rest of the UI code
   (`App.tsx`, `NetworkGraph`, `FeedPanel`, `ParameterPanel`, ...) required no
   changes.

## Post content datasets

The three CSV files under `simulation/data/` (one per narrative category) are
bundled at build time via Vite's `?raw` import and parsed with a small
hand-rolled CSV parser (`csvContent.ts`). No network fetch or server-side file
access is needed; the content ships inside the JavaScript bundle.

## Social graph generation

`GraphManager.modGameNet` builds the game's default network — a small number
of loosely connected communities that are grown into a clustered,
"echo-chamber-like" topology:

1. Partition nodes into `communities` groups and connect them with a higher
   within-group edge probability (`p_in`) than across groups (`p_out`).
2. Guarantee connectivity by bridging any disconnected components with a
   random edge.
3. Grow triangles (increase the average clustering coefficient) by repeatedly
   picking a degree-weighted hub node and connecting it to a
   friend-of-a-friend, until the target clustering coefficient is reached.

This is a from-scratch reimplementation of the equivalent Python logic that
previously relied on the `networkx` library, since no graph library
dependency is used in the browser bundle.

## Removed since the backend migration

- The FastAPI backend (`backend/`), its Dockerfile, and `requirements.txt`.
- The nginx `/api/*` reverse proxy and the `VITE_API_BASE` build argument.
- `frontend/src/api/client.ts` (REST client, no longer needed).
- The `docker-compose.yml` `backend` service and its healthcheck.
