# Sports Analysis Platform (SAP)

The **Sports Analysis Platform (SAP)** is a full-stack sports analytics application designed to deliver clean, structured, and scalable insights across multiple professional sports leagues.

The project is built with a **feature-first, league-agnostic architecture**, allowing new leagues (NFL, MLB, NHL, etc.) to be added without reworking existing systems.

Currently, the platform focuses on **NBA analytics**, with infrastructure intentionally designed to support expansion.

---

## Project Goals

- Provide a clean, modern sports analytics dashboard
- Separate data ingestion from data delivery
- Avoid premature databases while iterating quickly
- Maintain a scalable structure for multiple leagues
- Keep frontend and backend responsibilities clearly defined

---

## Tech Stack

### Frontend

- React + TypeScript
- Vite
- Chakra UI
- React Router
- Axios

### Backend

- Python
- Flask
- pandas
- nba_api
- CSV-based data storage

---

## Repository Structure

```txt
SAP/
├── backend/
│   ├── app.py                 # Flask API (read-only)
│   ├── main.py                # Data pipeline runner
│   ├── data/
│   │   └── processed/         # Generated CSV outputs
│   ├── src/
│   │   ├── common/            # Shared backend utilities
│   │   └── leagues/
│   │       └── nba/           # NBA-specific backend logic
│   └── README.md              # Backend documentation
│
├── frontend/
│   ├── src/
│   │   ├── app/               # App shell & routing
│   │   ├── features/          # League feature modules
│   │   ├── shared/            # Reusable UI & hooks
│   │   └── services/          # API client
│   ├── index.html
│   ├── package.json
│   └── README.md              # Frontend documentation
│
└── README.md                  # Project overview (this file)
```

---

## Architecture Overview

SAP follows a **decoupled pipeline + API + UI architecture**.

### Data Flow

```txt
External APIs (nba_api)
        ↓
Data Pipeline (main.py)
        ↓
Processed CSVs
        ↓
Flask API (app.py)
        ↓
React Frontend
```

This design ensures:

- The API remains fast and predictable
- Data ingestion can be scheduled independently
- Frontend development is decoupled from data fetching

---

## Backend Overview

The backend is split into two responsibilities:

### 1. Data Pipeline (`main.py`)

- Fetches raw data from external sources
- Cleans and normalizes datasets
- Computes derived metrics
- Writes CSVs to disk

The pipeline can be:

- Run manually
- Scheduled via OS tools (Task Scheduler / cron)

### 2. API Layer (`app.py`)

- Read-only Flask API
- Serves CSV-backed endpoints
- Computes lightweight views (e.g., stat leaders)
- Namespaced by league (`/api/nba/...`)

See `backend/README.md` for full details.

---

## Frontend Overview

The frontend is a modular React application organized by **feature and league**.

### Key Concepts

- Each league is a self-contained feature module
- Shared UI components live outside league logic
- URL-driven state enables deep linking
- Backend endpoints are consumed via a shared API client

### NBA Features

- Matchups (Today)
- Schedule
- Standings
- Teams (stats & rosters)
- League Stat Leaders

See `frontend/README.md` for full details.

---

## Adding a New League

SAP is designed so adding a new league does **not** require refactoring existing code.

High-level steps:

1. Add a new league folder in `backend/src/leagues/`
2. Implement pipeline logic for the league
3. Register CSV outputs in backend paths
4. Add API routes under `/api/<league>/...`
5. Create a new frontend feature module under `features/<league>/`

NBA serves as the reference implementation.

---

## Development Workflow

### Backend

```bash
cd backend
python main.py     # generate CSVs
python app.py      # start API
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Design Principles

- Clear separation of concerns
- League isolation
- Feature-first frontend architecture
- CSVs as the source of truth
- APIs are predictable and explicit
- Scales without rewrites

---

## Current Status

- ✅ NBA Home dashboard complete
- ✅ League stat leaders with advanced filters
- ✅ Clean frontend & backend architecture
- 🚧 NFL / MLB / NHL planned
- 🚧 Box score & historical game views planned

---

## Future Enhancements

- Automated data pipeline scheduling
- Pipeline metadata (last updated timestamps)
- Historical snapshots per season
- Box score drill-downs
- User authentication & saved views
- Database-backed storage (optional)

---

## License

This project is currently for personal development and portfolio use.

---

**Sports Analysis Platform**  
Built with scalability, clarity, and long-term growth in mind.
