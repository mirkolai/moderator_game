# Moderator Game

A modular simulation game about narrative spread in a dynamic social network. The backend runs a synchronous graph simulation in FastAPI, and the frontend renders the network and time-series views with React and D3.

## Structure

- `backend/`: FastAPI service, simulation engine, graph model, post system, and game logic
- `frontend/`: React + D3 interface with feed panel, animated network graph, parameter controls, and time-series chart

## Backend modules

- `app/domain/graph.py`: directed or undirected dynamic graph with edge evolution helpers
- `app/domain/post_system.py`: post lifecycle, seen/reposted tracking, censorship, and feed assembly
- `app/domain/simulation_engine.py`: synchronous generation, propagation, reposting, network evolution, and state updates
- `app/domain/game_logic.py`: classification percentages and win/loss conditions
- `app/api/routes.py`: simulation endpoints

## API endpoints

- `POST /api/simulation/start`
- `POST /api/simulation/reset`
- `POST /api/simulation/step`
- `GET /api/graph`
- `GET /api/feed/{node_id}`
- `POST /api/moderation/censor`
- `GET /api/posts/{post_id}/influence`
- `GET /api/timeseries`
- `GET /api/parameters`
- `PUT /api/parameters`
- `GET /api/status`

## Run with Docker (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:8081
- API docs (Swagger UI): http://localhost:8081/docs

Only port **8081** needs to be open on the server. The frontend container uses
nginx to serve the compiled SPA and reverse-proxies `/api/*` to the backend
container internally, so the backend port is never exposed and no CORS
configuration is needed.

## Run locally (without Docker)

### Backend

Node.js and npm are required for the frontend; only Python 3.12+ is needed for
the backend.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
```

## Simulation notes

- Node state is clamped to `[0, 1]`
- Post propagation only occurs from active emitters
- Censored posts remain visible but can no longer propagate or be reposted
- Reposting probability uses a sigmoid to keep outcomes stable
- Network evolution can add or remove edges each step
- Mission role is configurable: `well_informed_citizen` or `bad_actor`
- Bulldozers arrive is configurable with `election_step` (default 20, range 15-30)
- On bulldozers arrive, super-majority (`win_threshold`) or simple majority decides the game outcome
