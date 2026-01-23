from __future__ import annotations
from dataclasses import dataclass
from datetime import date
import pandas as pd

from src.leagues.nba.api.nba_data import load_games_df
from src.leagues.nba.pipeline.team_utils import normalize_team_name


def _winner(row: pd.Series) -> str | None:
    # expects HOME_PTS / AWAY_PTS in df for completed games
    hp = row.get("HOME_PTS")
    ap = row.get("AWAY_PTS")
    if pd.isna(hp) or pd.isna(ap):
        return None
    if float(hp) == float(ap):
        return None
    return "HOME" if float(hp) > float(ap) else "AWAY"


def _team_game_results(df: pd.DataFrame, team: str) -> pd.DataFrame:
    """Return all games involving team, with W/L from team perspective."""
    team = normalize_team_name(team)

    d = df.copy()
    d["HOME_TEAM"] = d["HOME_TEAM"].map(normalize_team_name)
    d["AWAY_TEAM"] = d["AWAY_TEAM"].map(normalize_team_name)

    # only games with final scores
    d = d.dropna(subset=["HOME_PTS", "AWAY_PTS"], how="any")
    d = d[d["STATUS"].isin(["FINAL", "Final", "COMPLETED", "Completed", "CLOSED", "Closed"]) | (d["HOME_PTS"] > 0) | (d["AWAY_PTS"] > 0)]

    d["WINNER"] = d.apply(_winner, axis=1)

    mask = (d["HOME_TEAM"] == team) | (d["AWAY_TEAM"] == team)
    d = d[mask].copy()

    # team perspective
    d["IS_HOME"] = d["HOME_TEAM"] == team
    d["RESULT"] = None
    d.loc[d["WINNER"].isna(), "RESULT"] = None
    d.loc[(d["IS_HOME"]) & (d["WINNER"] == "HOME"), "RESULT"] = "W"
    d.loc[(d["IS_HOME"]) & (d["WINNER"] == "AWAY"), "RESULT"] = "L"
    d.loc[(~d["IS_HOME"]) & (d["WINNER"] == "AWAY"), "RESULT"] = "W"
    d.loc[(~d["IS_HOME"]) & (d["WINNER"] == "HOME"), "RESULT"] = "L"

    # sort newest first
    d["GAME_DATE_EST"] = pd.to_datetime(d["GAME_DATE_EST"], errors="coerce")
    d = d.sort_values("GAME_DATE_EST", ascending=False)
    return d


def _record_from(df: pd.DataFrame) -> dict:
    w = int((df["RESULT"] == "W").sum())
    l = int((df["RESULT"] == "L").sum())
    return {"w": w, "l": l}


def _streak(df: pd.DataFrame) -> dict:
    # df newest -> oldest
    results = df["RESULT"].dropna().tolist()
    if not results:
        return {"type": None, "len": 0}
    first = results[0]
    n = 0
    for r in results:
        if r == first:
            n += 1
        else:
            break
    return {"type": first, "len": n}  # type: W or L


def _rest_days(df: pd.DataFrame, target_date: date) -> dict:
    if df.empty or df["GAME_DATE_EST"].isna().all():
        return {"restDays": None, "b2b": None}
    last_game = df["GAME_DATE_EST"].dropna().iloc[0].date()
    delta = (target_date - last_game).days
    # if they played yesterday => delta=1 => b2b today
    return {"restDays": max(delta, 0), "b2b": delta == 1}


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

    # H2H: last 10 meetings between the teams (either home/away)
    dd = df.copy()
    dd["HOME_TEAM"] = dd["HOME_TEAM"].map(normalize_team_name)
    dd["AWAY_TEAM"] = dd["AWAY_TEAM"].map(normalize_team_name)
    dd["GAME_DATE_EST"] = pd.to_datetime(dd["GAME_DATE_EST"], errors="coerce")
    dd = dd.sort_values("GAME_DATE_EST", ascending=False)

    h2h = dd[
        ((dd["HOME_TEAM"] == home_team) & (dd["AWAY_TEAM"] == away_team)) |
        ((dd["HOME_TEAM"] == away_team) & (dd["AWAY_TEAM"] == home_team))
    ].copy()

    h2h = h2h.dropna(subset=["HOME_PTS", "AWAY_PTS"], how="any").head(10)
    h2h["WINNER"] = h2h.apply(_winner, axis=1)

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

    return {
        "date": target_date.isoformat(),
        "away": {
            "team": away_team,
            "roadRecord": _record_from(away_road),
            "last10": _record_from(away_last10),
            "streak": _streak(away_games),
            **_rest_days(away_games, target_date),
        },
        "home": {
            "team": home_team,
            "homeRecord": _record_from(home_home),
            "last10": _record_from(home_last10),
            "streak": _streak(home_games),
            **_rest_days(home_games, target_date),
        },
        "h2hLast10": {"awayWins": away_wins, "homeWins": home_wins, "games": int(len(h2h))},
    }
