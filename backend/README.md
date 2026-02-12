# Sports Analysis Platform – Backend

This backend powers the **Sports Analysis Platform (SAP)**.
It is designed as a **data pipeline + lightweight API** that serves cleaned, structured data files to the frontend.

The backend is intentionally database-free at this stage, favoring:

- simplicity
- transparency
- fast iteration
- easy debugging

It is built to scale across multiple leagues (NBA, NFL, MLB, NHL) without requiring architectural rewrites.

---

## Core Philosophy

The backend is split into **two distinct responsibilities**:

1. **Pipeline (`main.py`)**
   - Fetches raw data (e.g. `nba_api`)
   - Cleans, transforms, and enriches it
   - Writes normalized datasets (CSV) to `backend/data/`

2. **API (`app.py`)**
   - Exposes read-only endpoints backed by processed datasets
   - Computes lightweight derived views (e.g. leaders)
   - Never fetches external data directly

This separation keeps the API fast and predictable, and allows the data pipeline to run independently on a schedule.

---

## Tech Stack

- Python
- Flask (API)
- pandas (data processing)
- nba_api (NBA data source)
- CSV-based storage (no database)

---

## Run with Docker

### Start API (and frontend)

From repository root:

```bash
docker compose up --build
```

API: http://localhost:5000

### Data persistence

Processed datasets are stored in `backend/data/` and are mounted into the API container, so they persist across restarts.

### Rebuild after code changes

If your Docker setup copies code into the image, rebuild after backend changes:

```bash
docker compose build --no-cache api
docker compose up -d
```

---

## Run locally (non-Docker)

### 1) Run the pipeline

```bash
cd backend
python main.py
```

### 2) Start the API

```bash
python app.py
```

---

## API Namespacing (League-First)

All league endpoints are namespaced:

```
/api/<league>/<resource>
```

Example NBA endpoints:

```
/api/nba/standings
/api/nba/teams
/api/nba/teams/<team_id>/stats
/api/nba/teams/<team_id>/roster
/api/nba/schedule/daily
/api/nba/schedule/range
/api/nba/games
/api/nba/leaders
```

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
