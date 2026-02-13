from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Literal, Optional

import pandas as pd

from src.leagues.nba.api.nba_data import load_games_df
from src.leagues.nba.pipeline.team_utils import normalize_team_name

FINAL_STATUSES = {
    "FINAL",
    "COMPLETED",
    "CLOSED",
}


# -----------------------------
# Dataclasses for stable API
# -----------------------------
@dataclass(frozen=True)
class WLRecord:
    w: int
    l: int


@dataclass(frozen=True)
class Streak:
    type: Optional[Literal["W", "L"]]
    len: int


@dataclass(frozen=True)
class SideInsights:
    team: str
    roadRecord: Optional[WLRecord] = None
    homeRecord: Optional[WLRecord] = None
    last10: WLRecord = WLRecord(0, 0)
    streak: Streak = Streak(None, 0)
    restDays: Optional[int] = None
    b2b: Optional[bool] = None


@dataclass(frozen=True)
class H2HSeason:
    awayWins: int
    homeWins: int
    games: int


@dataclass(frozen=True)
class MatchupInsights:
    date: str
    away: SideInsights
    home: SideInsights
    h2hSeason: H2HSeason


# -----------------------------
# Helpers
# -----------------------------
def _season_start_year(target_date: date) -> int:
    """NBA season typically starts in Oct. We use 'start year' for the season label."""
    return target_date.year if target_date.month >= 10 else target_date.year - 1


def _season_bounds(start_year: int) -> tuple[date, date]:
    """Loose date-range fallback if explicit season columns aren't present."""
    start = date(start_year, 10, 1)
    end = date(start_year + 1, 6, 30)
    return start, end


def _as_dt(s: pd.Series) -> pd.Series:
    return pd.to_datetime(s, errors="coerce")


def _is_final_like(df: pd.DataFrame) -> pd.Series:
    """Heuristic for 'completed game'."""
    status = df.get("STATUS")
    status_ok = False
    if status is not None:
        status_ok = status.astype(str).str.upper().isin(FINAL_STATUSES)

    hp = pd.to_numeric(df.get("HOME_PTS"), errors="coerce")
    ap = pd.to_numeric(df.get("AWAY_PTS"), errors="coerce")
    has_scores = hp.notna() & ap.notna()
    scored = (hp.fillna(0) > 0) | (ap.fillna(0) > 0)

    return status_ok | (has_scores & scored)


def _winner_side(df: pd.DataFrame) -> pd.Series:
    """Return 'HOME'/'AWAY'/None winner side for each row (vectorized)."""
    hp = pd.to_numeric(df.get("HOME_PTS"), errors="coerce")
    ap = pd.to_numeric(df.get("AWAY_PTS"), errors="coerce")

    out = pd.Series([None] * len(df), index=df.index, dtype="object")
    mask = hp.notna() & ap.notna() & (hp != ap)
    out.loc[mask & (hp > ap)] = "HOME"
    out.loc[mask & (hp < ap)] = "AWAY"
    return out


def _record_from(df: pd.DataFrame) -> WLRecord:
    w = int((df.get("RESULT") == "W").sum())
    l = int((df.get("RESULT") == "L").sum())
    return WLRecord(w=w, l=l)


def _streak(df: pd.DataFrame) -> Streak:
    results = df.get("RESULT")
    if results is None:
        return Streak(type=None, len=0)

    results_list = results.dropna().tolist()
    if not results_list:
        return Streak(type=None, len=0)

    first = results_list[0]
    n = 0
    for r in results_list:
        if r == first:
            n += 1
        else:
            break

    if first not in ("W", "L"):
        return Streak(type=None, len=0)
    return Streak(type=first, len=n)


def _team_game_results(df: pd.DataFrame, team: str) -> pd.DataFrame:
    """Return all completed games involving team, with W/L from team perspective."""
    team = normalize_team_name(team)

    d = df.copy()
    d["HOME_TEAM"] = d["HOME_TEAM"].map(normalize_team_name)
    d["AWAY_TEAM"] = d["AWAY_TEAM"].map(normalize_team_name)

    d["GAME_DATE_EST"] = _as_dt(d.get("GAME_DATE_EST"))

    d = d[_is_final_like(d)].copy()
    d["WINNER"] = _winner_side(d)

    d = d[(d["HOME_TEAM"] == team) | (d["AWAY_TEAM"] == team)].copy()

    d["IS_HOME"] = d["HOME_TEAM"] == team
    d["RESULT"] = None

    # Home games
    d.loc[(d["IS_HOME"]) & (d["WINNER"] == "HOME"), "RESULT"] = "W"
    d.loc[(d["IS_HOME"]) & (d["WINNER"] == "AWAY"), "RESULT"] = "L"

    # Away games
    d.loc[(~d["IS_HOME"]) & (d["WINNER"] == "AWAY"), "RESULT"] = "W"
    d.loc[(~d["IS_HOME"]) & (d["WINNER"] == "HOME"), "RESULT"] = "L"

    return d.sort_values("GAME_DATE_EST", ascending=False)


def _rest_days(team_games: pd.DataFrame, target_date: date) -> dict:
    """Compute restDays (full off days) and b2b flag."""
    if team_games.empty:
        return {"restDays": None, "b2b": None}

    d = team_games.copy()
    d["GAME_DATE_EST"] = _as_dt(d.get("GAME_DATE_EST"))
    d = d.dropna(subset=["GAME_DATE_EST"])

    d = d[d["GAME_DATE_EST"].dt.date < target_date]
    if d.empty:
        return {"restDays": None, "b2b": None}

    d = d.sort_values("GAME_DATE_EST", ascending=False)
    last_game = d.iloc[0]["GAME_DATE_EST"].date()

    delta = (target_date - last_game).days  # 1 means played yesterday
    off_days = max(delta - 1, 0)

    return {"restDays": int(off_days), "b2b": bool(delta == 1)}


def _filter_to_season(h2h: pd.DataFrame, *, season_start_year: int, target_date: date) -> pd.DataFrame:
    """Filter to current season (prefer explicit season columns; else date range)."""
    if h2h.empty:
        return h2h

    h2h = h2h[h2h["GAME_DATE_EST"].dt.date < target_date]

    if "SEASON" in h2h.columns:
        return h2h[h2h["SEASON"] == season_start_year]

    if "SEASON_YEAR" in h2h.columns:
        return h2h[h2h["SEASON_YEAR"] == season_start_year]

    if "SEASON_ID" in h2h.columns:
        try:
            season_id = int(f"2{season_start_year}")
            return h2h[h2h["SEASON_ID"] == season_id]
        except Exception:
            pass

    start, end = _season_bounds(season_start_year)
    return h2h[(h2h["GAME_DATE_EST"].dt.date >= start) & (h2h["GAME_DATE_EST"].dt.date <= end)]


# -----------------------------
# Public API
# -----------------------------
def get_matchup_insights(*, away_team: str, home_team: str, target_date: date) -> dict:
    df = load_games_df().copy()

    away_team = normalize_team_name(away_team)
    home_team = normalize_team_name(home_team)

    away_games = _team_game_results(df, away_team)
    home_games = _team_game_results(df, home_team)

    away_road = away_games[away_games["IS_HOME"] == False]
    home_home = home_games[home_games["IS_HOME"] == True]

    away_last10 = away_games.head(10)
    home_last10 = home_games.head(10)

    # ---- H2H season series only ----
    dd = df.copy()
    dd["HOME_TEAM"] = dd["HOME_TEAM"].map(normalize_team_name)
    dd["AWAY_TEAM"] = dd["AWAY_TEAM"].map(normalize_team_name)
    dd["GAME_DATE_EST"] = _as_dt(dd.get("GAME_DATE_EST"))
    dd = dd.dropna(subset=["GAME_DATE_EST"])

    h2h = dd[
        ((dd["HOME_TEAM"] == home_team) & (dd["AWAY_TEAM"] == away_team))
        | ((dd["HOME_TEAM"] == away_team) & (dd["AWAY_TEAM"] == home_team))
    ].copy()

    h2h = h2h[_is_final_like(h2h)].copy()

    season_start = _season_start_year(target_date)
    h2h = _filter_to_season(h2h, season_start_year=season_start, target_date=target_date)

    h2h["WINNER"] = _winner_side(h2h)

    away_wins = 0
    home_wins = 0
    for _, r in h2h.iterrows():
        w = r["WINNER"]
        if w == "HOME" and r["HOME_TEAM"] == away_team:
            away_wins += 1
        elif w == "AWAY" and r["AWAY_TEAM"] == away_team:
            away_wins += 1
        elif w == "HOME" and r["HOME_TEAM"] == home_team:
            home_wins += 1
        elif w == "AWAY" and r["AWAY_TEAM"] == home_team:
            home_wins += 1

    away_rest = _rest_days(away_games, target_date)
    home_rest = _rest_days(home_games, target_date)

    payload = MatchupInsights(
        date=target_date.isoformat(),
        away=SideInsights(
            team=away_team,
            roadRecord=_record_from(away_road),
            last10=_record_from(away_last10),
            streak=_streak(away_games),
            restDays=away_rest["restDays"],
            b2b=away_rest["b2b"],
        ),
        home=SideInsights(
            team=home_team,
            homeRecord=_record_from(home_home),
            last10=_record_from(home_last10),
            streak=_streak(home_games),
            restDays=home_rest["restDays"],
            b2b=home_rest["b2b"],
        ),
        h2hSeason=H2HSeason(awayWins=away_wins, homeWins=home_wins, games=int(len(h2h))),
    )

    return asdict(payload)
