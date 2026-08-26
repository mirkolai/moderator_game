# Moderator Game

A modular, fully client-side simulation game about narrative spread in a dynamic social network. The entire simulation engine, graph model, post system, and game logic run in the browser as a React + D3 single-page application — there is no backend server.

## Structure

- `frontend/`: React + D3 single-page app. Contains the UI (network graph, feed panel, parameter controls, time-series chart) and the simulation engine itself.
- `docs/ARCHITECTURE.md`: detailed description of the client-side simulation architecture.
- `utils/split_animals.py`: one-off dev utility to slice a sprite sheet into the per-animal avatar images used by the UI.

## Simulation modules (`frontend/src/simulation/`)

- `rng.ts`: deterministic pseudo-random number generator (mulberry32) used throughout the engine
- `csvContent.ts`: minimal CSV parser for the bundled post-content datasets
- `categories.ts`: narrative category definitions (alpha/beta/gamma) and their post content pools
- `parameters.ts`: default simulation parameters and range clamping
- `graph.ts`: dynamic social graph (community generation, convergent/discordant edge evolution)
- `postSystem.ts`: post lifecycle — creation, seen/reposted tracking, censorship, feed assembly
- `gameLogic.ts`: classification percentages and win/loss/election evaluation
- `engine.ts`: `SimulationEngine` — orchestrates one full simulation step (generation, propagation, reposting, network evolution, state updates)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deeper walkthrough.

## Run with Docker (recommended)

```bash
docker compose up --build
```

- App: http://localhost:8081

Only port **8081** needs to be open on the server. The container serves the pre-built static SPA via nginx; no backend service or API proxy is required.

## Run locally (without Docker)

Only Node.js and npm are required — there is no Python backend to install or run.

```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
```

To produce a production build:

```bash
cd frontend
npm run build       # outputs static assets to frontend/dist
npm run preview      # serve the production build locally
```

## Simulation notes

- Node state is clamped to `[0, 1]`
- Post propagation only occurs from active emitters
- Censored posts remain visible but can no longer propagate or be reposted
- Reposting probability uses a sigmoid to keep outcomes stable
- Network evolution can add or remove edges each step
- Bulldozers arrive is configurable with `election_step` (default 20, range 15-30)
- On bulldozers arrive, super-majority (`win_threshold`) or simple majority decides the game outcome

