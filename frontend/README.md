# Sports Analysis Platform – Frontend

This is the frontend for the **Sports Analysis Platform (SAP)** — a modular, league-agnostic sports analytics application built with **React, TypeScript, Vite, Chakra UI, and React Router**.

The frontend is designed to scale cleanly across multiple leagues (NBA, NFL, MLB, NHL) while keeping league-specific logic isolated and reusable UI centralized.

---

## Tech Stack

- React + TypeScript
- Vite (development & build tooling)
- Chakra UI (component library & theming)
- React Router (routing & nested shells)
- Axios (API communication)

---

## Development

### Run with Docker (recommended quick start)

From the repository root:

```bash
docker compose up --build
```

Frontend: http://localhost:5173

> If you edit frontend source code and your Docker setup copies code into the image, rebuild with:
> `docker compose build --no-cache frontend && docker compose up -d`

### Run locally (non-Docker)

```bash
cd frontend
npm install
npm run dev
```

---

## High-Level Architecture

The frontend is organized into four core layers:

```txt
app/        → Global application shell & routing
features/   → League-specific functionality (NBA, NFL, MLB, NHL)
shared/     → Reusable UI, hooks, utilities (cross-league)
services/   → API client & shared data access
```

---

## Routing & App Shell

`App.tsx` defines top-level routing:

- `/` → Home (league selection)
- `/nba/*` → NBA feature shell
- `/nfl/*` → NFL feature shell
- `/mlb/*` → MLB feature shell
- `/nhl/*` → NHL feature shell

Each league owns its own shell and internal routing.

---

## NBA Features (Implemented)

- NBA Home (tabbed tools)
  - Matchups (Today)
  - Schedule
  - Standings
  - Teams (stats & rosters)
  - Stat Leaders
- NBA Trends
  - Player game trend widget
  - Matchup insights widget

---

## MLB Features (Implemented)

- MLB Home (tabbed tools)
  - Matchups (Today)
  - Schedule
  - Standings
  - Teams (stats & rosters)
  - Pitching/Batting Stat Leaders

---

## Updated Frontend File Structure

```txt
src/
├── app/
│   ├── App.tsx
│   ├── main.tsx
│   ├── theme.ts
│   ├── index.css
│   └── shell/
│       ├── TopNavBar.tsx
│       ├── ToolGrid.tsx
│       └── ToolSelector.tsx
│
├── features/
│   ├── nba/
│   │   ├── shell/
│   │   │   └── NbaShell.tsx
│   │   ├── home/
│   │   │   ├── NbaHome.tsx
│   │   │   └── tabs/
│   │   │       ├── NbaTodayTab.tsx
│   │   │       ├── NbaScheduleTab.tsx
│   │   │       ├── NbaStandingsTab.tsx
│   │   │       ├── NbaTeamsTab.tsx
│   │   │       └── NbaStatLeadersTab.tsx
│   │   ├── trends/
│   │   │   ├── NbaTrends.tsx
│   │   │   └── widgets/
│   │   │       ├── PlayerGameTrendWidget.tsx
│   │   │       ├── MatchupInsightsWidget.tsx
│   │   │       └── HotStreakStatTrackerWidget.tsx
│   │   ├── history/       (planned)
│   │   └── services/
│   │       └── nbaApi.ts  (optional)
│   │
│   ├── nfl/
│   │   └── shell/
│   │       └── NflShell.tsx
│   │
│   ├── mlb/
│   │   └── shell/
│   │       └── MlbShell.tsx
│   │   ├── home/
│   │   │   ├── MlbHome.tsx
│   │   │   └── tabs/
│   │   │       ├── MlbTodayTab.tsx
│   │   │       ├── MlbScheduleTab.tsx
│   │   │       ├── MlbStandingsTab.tsx
│   │   │       ├── MlbTeamsTab.tsx
│   │   │       └── MlbLeadersTab.tsx
│   │   ├── trends/        (planned)
│   │   ├── advancedMetrics/       (planned)
│   │   └── services/
│   │       └── nbaApi.ts  (optional)
│   │
│   └── nhl/
│       └── shell/
│           └── NhlShell.tsx
│
├── shared/
│   ├── components/
│   │   └── ColorModeSwitch.tsx
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── services/
│   └── apiClient.ts
│
└── assets/
    └── [LEAGUE]logo.png
```

---

## API Connectivity

The frontend consumes data from the backend via `/api/<league>/...` endpoints (e.g., `/api/nba/schedule/daily`).

If you ever need to change the API base URL (for non-Docker environments), do it in the shared API client under `src/services/`.

---

## Design Philosophy

- Feature-first architecture
- League isolation
- Shared UI, not shared league logic
- URL-driven state
- Scalable without rewrites
