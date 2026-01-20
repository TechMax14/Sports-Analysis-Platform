# Sports Analysis Platform – Frontend

This is the frontend for the **Sports Analysis Platform (SAP)** — a modular, league-agnostic sports analytics application built with **React, TypeScript, Vite, Chakra UI, and React Router**.

The frontend is designed to scale cleanly across multiple leagues (NBA, NFL, MLB, NHL) while keeping league-specific logic isolated and reusable UI centralized.

---

## Tech Stack

- **React + TypeScript**
- **Vite** (development & build tooling)
- **Chakra UI** (component library & theming)
- **React Router** (routing & nested shells)
- **Axios** (API communication)
- **CSS + Chakra theme system**

---

## App Entry & Bootstrapping

### `index.html`

The application mounts to a single root element and loads the React app from `main.tsx`.

```html
<div id="root"></div>
```

### `main.tsx`

- Initializes the React application
- Wraps the app in `ChakraProvider`
- Applies global theme and color mode
- Renders `<App />`

This is the **true entry point** of the frontend.

---

## High-Level Architecture

The frontend is organized into **three core layers**:

```
app/        → Global application shell & routing
features/   → League-specific functionality (NBA, NFL, MLB, NHL)
shared/     → Reusable UI, hooks, utilities (cross-league)
services/   → API client & shared data access
```

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
│       ├── NavBar.tsx
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
│   │   │       ├── TodayTab.tsx
│   │   │       ├── ScheduleTab.tsx
│   │   │       ├── StandingsTab.tsx
│   │   │       ├── TeamsTab.tsx
│   │   │       └── StatLeadersTab.tsx
│   │   ├── trends/        (planned)
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
    └── logo.png
```

---

## Routing & App Shell

### `App.tsx`

Defines **top-level routing** using React Router:

- `/` → Home (league selection)
- `/nba/*` → NBA feature shell
- `/nfl/*` → NFL feature shell
- `/mlb/*` → MLB feature shell
- `/nhl/*` → NHL feature shell

Each league owns its own shell and internal routing.

---

## Home (League Selector)

### `Home.tsx`

The landing page that allows users to select a league.

---

## App Shell Layer (`app/`)

Contains **global layout and navigation** shared across all leagues.

---

## NBA Feature Overview

### `features/nba/shell/NbaShell.tsx`

Entry point for all NBA functionality.

### `features/nba/home/NbaHome.tsx`

Tabbed NBA Home tool:

- Matchups
- Schedule
- Standings
- Teams
- Stat Leaders

Tab state is synced to URL query params.

---

## Services Layer (`services/`)

### `services/apiClient.ts`

Shared Axios client for all leagues.

---

## Shared Layer (`shared/`)

Contains reusable UI components, hooks, utilities, and shared types.

---

## Adding a New League

1. Create a folder under `features/`
2. Add a `<League>Shell.tsx`
3. Add tools (home, trends, history)
4. Wire the shell into `App.tsx`

---

## Development

```bash
npm install
npm run dev
```

---

## Design Philosophy

- Feature-first architecture
- League isolation
- Shared UI, not shared logic
- URL-driven state
- Scalable without rewrites
