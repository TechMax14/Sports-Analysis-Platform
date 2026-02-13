# Sports Analysis Platform -- Backend

This backend powers the **Sports Analysis Platform (SAP)**.

It is designed as a **data pipeline + lightweight API** that serves
cleaned, structured data files to the frontend.

The backend is intentionally database-free at this stage, favoring:

- simplicity
- transparency
- fast iteration
- easy debugging

It is built to scale across multiple leagues (NBA, NFL, MLB, NHL)
without requiring architectural rewrites.

---

# Architecture Overview

The backend is split into **three logical layers**:

## 1) Fetch Layer

Responsible for external API calls (e.g. `nba_api`, future `nflfastR`).

## 2) Process Layer

Cleans, transforms, and normalizes data into structured CSV outputs.

## 3) Serve Layer (Flask API)

- Exposes read-only endpoints
- Reads only processed CSV files
- Never calls external APIs directly

This separation keeps the API fast and predictable while allowing the
pipeline to run independently.

---

# Pipeline Orchestration & Caching (NEW)

`main.py` is now an **orchestrator**, not a "run everything every time"
script.

## Why This Matters

Without caching: - Every run of `main.py` would re-hit external APIs -
Risk rate limits and timeouts - Slow development iteration

With caching: - Each pipeline group has a **TTL (time-to-live)** - If
data is still fresh → it is skipped - If missing or stale → it rebuilds

---

## How Caching Works

Each pipeline group writes a small marker file:

    backend/data/processed/<league>/.cache/<group>.done

When you run `main.py`, it checks:

- Does the marker file exist?
- Is it younger than the group TTL?

If yes → skip rebuild\
If no → run pipeline → update marker

This prevents unnecessary API calls and makes repeated runs fast.

---

# Running with Docker

## Start API + Frontend

From repository root:

```bash
docker compose up --build
```

API: http://localhost:5000

---

## Running the Data Pipeline (Docker)

General run:

```bash
docker compose exec api python main.py
```

---

## Targeted Pipeline Runs (Recommended)

### Run only schedule (fast refresh)

```bash
docker compose exec api python main.py --league nba --group schedule
```

### Run only core datasets

```bash
docker compose exec api python main.py --league nba --group core
```

### Force full rebuild (ignore TTL)

```bash
docker compose exec api python main.py --league nba --group all --force
```

---

## Expected Behavior

- First run after build → likely full rebuild (no cache markers yet)
- Second run immediately after → very fast (most groups skipped)
- Over time → only expired groups rebuild

---

# Data Persistence

Processed datasets are stored in:

    backend/data/

This directory is mounted into the Docker container and persists across
restarts.

---

# Rebuilding Docker After Backend Changes

If your Docker image copies backend code into the container, you must
rebuild after code changes:

```bash
docker compose build --no-cache api
docker compose up -d
```

If you mount `./backend:/app`, rebuild is not required for code changes.

---

# Running Locally (Non-Docker)

## Run Pipeline

```bash
cd backend
python main.py
```

## Start API

```bash
python app.py
```

---

# API Namespacing (League-First)

All endpoints follow:

    /api/<league>/<resource>

Example NBA endpoints:

    /api/nba/standings
    /api/nba/teams
    /api/nba/teams/<team_id>/stats
    /api/nba/teams/<team_id>/roster
    /api/nba/schedule/daily
    /api/nba/schedule/range
    /api/nba/games
    /api/nba/leaders

Future NFL endpoints will follow the same pattern:

    /api/nfl/...

---

## Backend Structure

```txt
backend/
├── app.py                 # Flask app (API only)
├── main.py                # Pipeline runner (batch jobs)
├── data/
│   └── processed/         # Generated CSV outputs
│       └── nba_*.csv
│
├── src/
│   ├── common/            # Shared utilities (cross-league)
│   │   ├── paths.py
│   │   ├── response.py
│   │   └── image_urls.py
│   │
│   └── leagues/
│       └── nba/
│           ├── pipeline/  # Data extraction & transforms
│           │   ├── fetch_data.py
│           │   └── ...
│           │
│           └── api/       # API-side helpers
│               ├── nba_data.py
│               └── nba_leaders.py
│
├── Dockerfile
└── README.md
```

---

## Adding a New League

1. Create `src/leagues/<league>/` with:
   - `pipeline/` (ingestion + transforms)
   - `api/` (API-side helpers)
2. Register any new processed datasets in shared path helpers
3. Add routes under `/api/<league>/...` in `app.py`
4. Extend `main.py` to run the new pipeline jobs

NBA is the reference implementation.
