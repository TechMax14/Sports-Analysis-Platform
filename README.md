# Sports Analysis Platform (SAP)

The **Sports Analysis Platform (SAP)** is a full-stack sports analytics application designed to deliver clean, structured, and scalable insights across multiple professional sports leagues.

The project is built with a **feature-first, league-agnostic architecture**, allowing new leagues (NBA, MLB, NFL, NHL, and beyond) to be added without reworking the overall system.

The platform currently includes a mature **NBA experience** and an initial **MLB experience** with a dedicated league shell, league-specific branding, and an MLB Home view now integrated into the frontend.

---

# 🚀 Screenshots

## NBA Home -- Matchups

Daily matchup dashboard with schedule navigation and live status
indicators.

![Matchups](screenshots/NBA/Home/Matchups.JPG)

---

## League Stat Leaders

Season leaders with stat toggles and filtering controls.

![Stat Leaders](screenshots/NBA/Home/Stat%20Leaders.JPG)

---

## Teams & Rosters

Team-level stats with roster breakdown and advanced metrics.

![Teams](screenshots/NBA/Home/Teams.JPG)

---

## NBA Trends

Player game trends and matchup insights widgets.

<div style="display: flex; gap: 10px;">
  <img src="screenshots/NBA/Trends/Player%20Trends%20+%20Matchup%20Insights.JPG" width="48%" />
  <img src="screenshots/NBA/Trends/Player%20Consistency%20Tracker.JPG" width="48%" />
</div>

---

## MLB Home -- Matchups

Daily matchup dashboard with schedule navigation and live status
indicators.

![Matchups](screenshots/MLB/Home/Today%27s%20Games.JPG)

---

## Division Standings

Team-level stats with roster breakdown and advanced metrics.

![Teams](screenshots/MLB/Home/Standings.JPG)

---

## Teams & Rosters

Team-level stats with roster breakdown and advanced metrics.

<div style="display: flex; gap: 10px;">
  <img src="screenshots/MLB/Home/Teams.JPG" width="48%" />
  <img src="screenshots/MLB/Home/Teams%20-%20Roster.JPG" width="48%" />
</div>
---

## League Stat Leaders

Season leaders, for both Pitching and Batting, with stat toggles and filtering controls.

<div style="display: flex; gap: 10px;">
  <img src="screenshots/MLB/Home/Leaders%20-%20Batting.JPG" width="48%" />
  <img src="screenshots/MLB/Home/Leaders%20-%20Pitching.JPG" width="48%" />
</div>

---

# 🧠 Project Goals

- Provide a clean, modern sports analytics dashboard
- Separate data ingestion from data delivery
- Avoid premature databases while iterating quickly
- Maintain a scalable structure for multiple leagues
- Keep frontend and backend responsibilities clearly defined
- Support league-by-league expansion without breaking existing features

---

# 🛠 Tech Stack

## Frontend

- React + TypeScript
- Vite
- Chakra UI
- React Router
- Axios

## Backend

- Python
- Flask
- pandas
- CSV-based data storage
- League-specific data ingestion pipelines

---

# 🗂 Repository Structure

```txt
SPORTS-ANALYSIS-PLATFORM/
├── backend/
│   ├── app.py                 # Flask API (read-only)
│   ├── main.py                # Data pipeline runner
│   ├── data/                  # Processed CSV outputs
│   ├── src/
│   │   ├── common/            # Shared backend utilities
│   │   └── leagues/
│   │       ├── nba/           # NBA-specific backend logic
│   │       └── mlb/           # MLB-specific backend logic
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/               # App-level shell, routing, and shared navigation
│   │   ├── features/          # League feature modules
│   │   │   ├── nba/
│   │   │   └── mlb/
│   │   ├── shared/            # Reusable UI & hooks
│   │   └── services/          # API client
│   └── README.md
│
├── screenshots/
│   ├── NBA/
│   │   ├── Home/
│   │   └── Trends/
│   └── MLB/
│       └── Home/
│
├── docker-compose.yml
└── README.md
```

---

# 🏗 Architecture Overview

SAP follows a **decoupled pipeline + API + UI architecture**.

The frontend now uses a clearer separation between:

- **App-level navigation** for league switching
- **League-level shells** for league branding, tools, and content
- **Feature modules** for each sport's pages and widgets

## Data Flow

```txt
External APIs / league data sources
        ↓
Data Pipeline (backend/main.py)
        ↓
Processed CSVs (backend/data/)
        ↓
Flask API (backend/app.py)
        ↓
React Frontend (frontend/)
```

---

# 🐳 Running with Docker (Recommended)

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)

## Start the App

From the project root:

```bash
docker compose up --build
```

Frontend:

    http://localhost:5173

Backend API:

    http://localhost:5000

---

## Stop the App

```bash
docker compose down
```

---

## Rebuild After Backend Changes

If backend code changes:

```bash
docker compose build --no-cache api
docker compose up -d
```

Or if you want to run just `main.py`:

```bash
docker compose exec api python main.py
```

---

## Data Persistence

Processed datasets live in:

    backend/data/

This folder is mounted into the API container, so data persists across container restarts.

---

# 💻 Running Without Docker

## Backend

```bash
cd backend
python main.py     # generate CSVs
python app.py      # start API
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 📈 Current Features

## NBA

- Daily Matchups
- Full Schedule
- Standings
- Teams (stats & rosters)
- League Stat Leaders
- Player Game Trend Widget
- Matchup Insights Widget
- Hot Streak Stat Tracker Widget

## MLB

- MLB Home view
- League-specific shell and branded header
- Sidebar-based navigation structure
- Foundation for MLB trends and advanced metrics views

---

# 🎯 Design Principles

- Clear separation of concerns
- League isolation
- Feature-first frontend architecture
- CSVs as the source of truth
- Predictable API contracts
- Scales without rewrites
- Favor simple, reusable layout patterns over premature abstraction

---

# 🔮 Planned Enhancements

- Expanded MLB leaderboard constraints
- Plate appearance support for MLB hitter workflows
- Innings pitched support for MLB pitcher workflows
- Automated pipeline scheduling
- Historical season snapshots
- Box score drill-downs
- Cross-league comparisons
- NFL implementation
- NHL implementation

---

# 📜 License

This project is currently for personal development and portfolio use.

---

**Sports Analysis Platform**  
Built with scalability, clarity, and long-term growth in mind.
