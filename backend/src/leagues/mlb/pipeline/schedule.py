from __future__ import annotations

from datetime import datetime
import pandas as pd
import statsapi


def _safe_get(d: dict, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def _normalize_status(detailed_state: str | None, abstract_state: str | None) -> str:
    ds = (detailed_state or "").lower()
    a = (abstract_state or "").lower()

    if "final" in ds:
        return "Final"
    if "in progress" in ds or "live" in ds:
        return "Live"
    if "preview" in ds or "scheduled" in ds or "pre-game" in ds:
        return "Scheduled"
    if "final" in a:
        return "Final"
    if "live" in a:
        return "Live"
    return detailed_state or abstract_state or "Unknown"


def fetch_mlb_schedule(season: int | None = None) -> pd.DataFrame:
    """
    Pull full MLB schedule for a season and return a flat DataFrame.
    """
    if season is None:
        season = datetime.now().year

    data = statsapi.get(
        "schedule",
        {
            "sportId": 1,
            "season": season,
            "hydrate": "team,linescore,venue",
        },
    )

    rows_out: list[dict] = []

    for date_block in data.get("dates", []):
        game_date = date_block.get("date")

        for game in date_block.get("games", []):
            teams = game.get("teams", {})
            away = teams.get("away", {})
            home = teams.get("home", {})

            away_team = away.get("team", {})
            home_team = home.get("team", {})

            status = game.get("status", {})
            detailed_state = status.get("detailedState")
            abstract_state = status.get("abstractGameState")

            game_datetime_raw = game.get("gameDate")
            game_datetime = None
            game_time_et = None

            if game_datetime_raw:
                try:
                    dt_utc = datetime.fromisoformat(game_datetime_raw.replace("Z", "+00:00"))
                    game_datetime = dt_utc.isoformat()
                    game_time_et = dt_utc.astimezone().strftime("%Y-%m-%d %I:%M %p %Z")
                except Exception:
                    game_datetime = game_datetime_raw

            away_score = away.get("score")
            home_score = home.get("score")

            is_home_win = None
            if home_score is not None and away_score is not None:
                if home_score > away_score:
                    is_home_win = True
                elif away_score > home_score:
                    is_home_win = False

            rows_out.append(
                {
                    "GAME_ID": game.get("gamePk"),
                    "GAME_DATE": game_date,
                    "GAME_DATETIME": game_datetime,
                    "GAME_TIME_DISPLAY": game_time_et,
                    "SEASON": season,
                    "STATUS": _normalize_status(detailed_state, abstract_state),
                    "DETAILED_STATE": detailed_state,
                    "ABSTRACT_STATE": abstract_state,
                    "DOUBLEHEADER": game.get("doubleHeader"),
                    "DAY_NIGHT": game.get("dayNight"),
                    "SERIES_GAME_NUMBER": game.get("seriesGameNumber"),
                    "SERIES_DESCRIPTION": game.get("seriesDescription"),
                    "VENUE": _safe_get(game, "venue", "name"),

                    "AWAY_TEAM_ID": away_team.get("id"),
                    "AWAY_TEAM_NAME": away_team.get("name"),
                    "AWAY_TEAM_ABBREVIATION": away_team.get("abbreviation"),
                    "AWAY_SCORE": away_score,
                    "AWAY_IS_WINNER": away.get("isWinner"),

                    "HOME_TEAM_ID": home_team.get("id"),
                    "HOME_TEAM_NAME": home_team.get("name"),
                    "HOME_TEAM_ABBREVIATION": home_team.get("abbreviation"),
                    "HOME_SCORE": home_score,
                    "HOME_IS_WINNER": home.get("isWinner"),

                    "IS_HOME_WIN": is_home_win,
                }
            )

    df = pd.DataFrame(rows_out)

    if not df.empty:
        sort_cols = [c for c in ["GAME_DATE", "GAME_DATETIME", "GAME_ID"] if c in df.columns]
        if sort_cols:
            df = df.sort_values(sort_cols).reset_index(drop=True)

    return df