# Sports Analysis Platform – Backend

This backend powers the **Sports Analysis Platform (SAP)**.
It is designed as a **data pipeline + lightweight API** that serves cleaned, structured CSV data to the frontend.

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
   - Writes normalized CSVs to disk

2. **API (`app.py`)**
   - Exposes read-only endpoints backed by CSVs
   - Computes lightweight derived views (e.g. leaders)
   - Never fetches external data directly

This separation keeps the API fast and predictable, and allows the data pipeline to run independently on a schedule.

---

## Tech Stack

- **Python**
- **Flask** (API)
- **pandas** (data processing)
- **nba_api** (NBA data source)
- **CSV-based storage** (no database)

---

## High-Level Backend Structure

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
└── README.md
```

---

## `main.py` – Data Pipeline

### Purpose

`main.py` is responsible for generating all CSV data consumed by the frontend.

Typical tasks:

- Fetch raw data from external APIs
- Normalize schemas
- Compute derived metrics
- Write outputs to `data/processed/`

### Key Characteristics

- **No Flask**
- **No endpoints**
- **Safe to run independently**
- Uses atomic writes to avoid file-lock issues

### How it’s intended to run

- Manually during development
- Automatically via:
  - Windows Task Scheduler
  - Cron (Linux/macOS)
  - CI job (future)

Example:

```bash
python main.py
```

---

## `app.py` – API Layer

### Purpose

`app.py` is a **thin read-only API** that serves CSV-backed data to the frontend.

Responsibilities:

- Expose REST endpoints
- Load CSVs
- Apply lightweight filters or aggregations
- Return JSON

### What it does _not_ do

- No scraping
- No long computations
- No writes to disk
- No database access

---

## API Namespacing (League-First)

All league endpoints are namespaced:

```
/api/<league>/<resource>
```

### Example NBA endpoints

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

## CSV-Backed Endpoints

Many endpoints are simple wrappers around CSV files using a shared helper.

### `csv_resp` utility

Defined in `src/common/response.py`.

Responsibilities:

- Load a CSV by key
- Optionally filter by column/value
- Convert NaN → `null`
- Return JSON records

Example usage:

```python
return csv_resp("nba_standings")
return csv_resp("nba_team_stats", "TEAM_ID", team_id)
```

---

## Computed Endpoints

Some endpoints compute derived views on top of CSVs.

### Example: NBA Leaders

```
/api/nba/leaders
```

- Reads `nba_roster_master.csv`
- Applies qualification rules (games played, attempts)
- Groups stats into cards with selectable options
- Returns a frontend-ready payload

Logic lives in:

```
src/leagues/nba/api/nba_leaders.py
```

---

## Common Utilities (`src/common/`)

### `paths.py`

Central source of truth for:

- CSV locations
- File keys
- Directory structure

Prevents hard-coded paths across the codebase.

---

### `response.py`

Houses:

- `csv_resp`
- Shared response helpers

Keeps endpoints consistent and DRY.

---

### `image_urls.py`

League-agnostic helper for constructing image URLs (e.g. player headshots).

---

## Adding a New League (NFL / MLB / NHL)

To add a new league:

1. Create a new folder:

```
src/leagues/<league>/
```

2. Add:

```
pipeline/
api/
season.py
```

3. Update:

- `main.py` to run the new pipeline
- `paths.py` to register new CSVs
- `app.py` to expose `/api/<league>/...` endpoints

No existing NBA logic needs to be modified.

---

## Development Workflow

### Run the pipeline

```bash
python main.py
```

### Start the API

```bash
python app.py
```

### Typical workflow

1. Run `main.py` to refresh CSVs
2. Start Flask API
3. Frontend reads data via `/api/<league>/...`

---

## Design Principles

- Pipeline and API are decoupled
- League logic is isolated
- CSVs are the source of truth
- Endpoints are predictable and namespaced
- Structure scales without rewrites

---

## Future Enhancements

- Automated pipeline scheduling
- Pipeline status metadata (`last_updated`)
- Database backing (optional)
- Authenticated endpoints
- Historical snapshots per season

---

This backend is intentionally simple, transparent, and extensible — optimized for rapid iteration while remaining structurally sound for long-term growth.
